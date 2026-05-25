const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onRequest }         = require('firebase-functions/v2/https')
const { defineSecret }      = require('firebase-functions/params')
const { getFirestore }      = require('firebase-admin/firestore')
const { getAuth }           = require('firebase-admin/auth')

try { require('firebase-admin/app').initializeApp() } catch {}

const db = getFirestore()

// Secrets (ตั้งค่าด้วย: firebase functions:secrets:set LINE_CHANNEL_SECRET)
const LINE_SECRET = defineSecret('LINE_CHANNEL_SECRET')
const LINE_TOKEN  = defineSecret('LINE_CHANNEL_ACCESS_TOKEN')

const REGION = 'asia-southeast3'


//  Function 1: ส่ง LINE Flex Message เมื่อรถซ่อมเสร็จ
exports.sendLineOnRepairDone = onDocumentUpdated(
  {
    document: 'repairs/{repairId}',
    region:   REGION,
    secrets:  [LINE_TOKEN],
  },
  async (event) => {
    const before = event.data.before.data()
    const after  = event.data.after.data()

    // เฉพาะเมื่อเปลี่ยนเป็น 'done'
    if (before.status === after.status) return null
    if (after.status !== 'done')        return null

    // ดึงข้อมูล user
    const userSnap = await db.doc(`users/${after.userId}`).get()
    if (!userSnap.exists) return null

    const { lineId, notifPrefs, name } = userSnap.data()

    // ส่งเฉพาะคนที่มี LINE และยินยอม
    if (!lineId || notifPrefs?.line === false) return null

    const accessToken = LINE_TOKEN.value()
    if (!accessToken) return null

    // คำนวณราคารวม
    const total = (after.costItems || []).reduce((s, i) => s + (i.price || 0), 0)
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    // LINE Flex Message
    const message = {
      to: lineId,
      messages: [{
        type:     'flex',
        altText:  `รถ ${after.plate} ซ่อมเสร็จแล้ว — 179 Auto`,
        contents: {
          type:   'bubble',
          size:   'kilo',
          header: {
            type:   'box',
            layout: 'vertical',
            contents: [{
              type:  'text',
              text:  '✅  รถซ่อมเสร็จแล้ว!',
              weight: 'bold',
              size:  'lg',
              color: '#ffffff',
            }],
            backgroundColor: '#E8863A',
            paddingAll:      '16px',
          },
          body: {
            type:    'box',
            layout:  'vertical',
            spacing: 'sm',
            contents: [
              { type:'text', text:`สวัสดี คุณ${name}`, size:'sm', color:'#888888' },
              { type:'separator', margin:'md' },
              ...[
                ['ทะเบียนรถ', after.plate],
                ['ช่างซ่อม', after.mechanicName || '-'],
                ['งานซ่อม', (after.costItems || []).map(i => i.name).join(', ') || '-'],
                ['ค่าบริการ', `฿${total.toLocaleString()}`],
                ['วันที่เสร็จ', dateStr],
              ].map(([k, v]) => ({
                type: 'box', layout: 'horizontal', margin: 'sm',
                contents: [
                  { type: 'text', text: k,  size: 'sm', color: '#888888', flex: 2 },
                  { type: 'text', text: v,  size: 'sm', weight: 'bold',   flex: 3, wrap: true },
                ],
              })),
            ],
          },
          footer: {
            type:    'box',
            layout:  'vertical',
            spacing: 'sm',
            contents: [{
              type:   'button',
              style:  'primary',
              color:  '#E8863A',
              action: {
                type:  'uri',
                label: 'ดูรายละเอียด',
                uri:   'https://garageplus.app/status',
              },
            }, {
              type:   'button',
              style:  'secondary',
              action: {
                type:  'uri',
                label: 'โทรถามอู่',
                uri:   'tel:053XXXXXX',
              },
            }],
          },
        },
      }],
    }

    await fetch('https://api.line.me/v2/bot/message/push', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    })

    return null
  }
)


// Sprint 6 — Function 2: LINE Login Callback → Firebase Custom Token
// GET https://<region>-<project>.cloudfunctions.net/lineCallback?code=...
exports.lineCallback = onRequest(
  { region: REGION, secrets: [LINE_SECRET, LINE_TOKEN] },
  async (req, res) => {
    const { code, state, error } = req.query

    if (error) {
      return res.redirect(`${process.env.APP_URL || 'https://garageplus.app'}/login?error=line_denied`)
    }
    if (!code) {
      return res.status(400).send('Missing code parameter')
    }

    try {
      const channelId     = process.env.LINE_CHANNEL_ID
      const channelSecret = LINE_SECRET.value()
      const appUrl        = process.env.APP_URL || 'https://garageplus.app'

      // 1. Exchange code → LINE access token
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          grant_type:    'authorization_code',
          code,
          redirect_uri:  `${appUrl}/api/auth/line/callback`,
          client_id:     channelId,
          client_secret: channelSecret,
        }),
      })
      const { access_token, error: tokenError } = await tokenRes.json()
      if (tokenError || !access_token) throw new Error('LINE token exchange failed')

      // 2. ดึง LINE Profile
      const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const profile = await profileRes.json()

      // LINE uid เป็น string เช่น "Uxxxxxxxx"
      const lineUid  = `line:${profile.userId}`
      const lineId   = profile.userId
      const name     = profile.displayName
      const picture  = profile.pictureUrl

      // 3. หาหรือสร้าง Firebase user
      let firebaseUid
      try {
        const existing = await getAuth().getUserByProviderUid('line.me', lineId)
        firebaseUid = existing.uid
      } catch {
        // ยังไม่มี → สร้างใหม่
        const newUser = await getAuth().createUser({
          displayName:   name,
          photoURL:      picture,
          providerToLink: {
            uid:        lineId,
            providerId: 'line.me',
          },
        })
        firebaseUid = newUser.uid

        // สร้าง Firestore user doc
        await db.doc(`users/${firebaseUid}`).set({
          name,
          lineId,
          email:           '',
          phone:           '',
          points:          0,
          usageCount:      0,
          memberSince:     new Date(),
          notifPrefs:      { status: true, promo: true, maintenance: true, line: true },
          darkMode:        true,
          language:        'th',
          fcmToken:        '',
          consentAccepted: true,
          consentDate:     new Date().toISOString(),
          consentVersion:  '1.0',
          marketingConsent: false,
        }, { merge: true })
      }

      // 4. สร้าง Firebase Custom Token
      const customToken = await getAuth().createCustomToken(firebaseUid)

      // 5. Redirect กลับแอพพร้อม token
      return res.redirect(`${appUrl}/login?lineToken=${customToken}`)
    } catch (err) {
      console.error('[lineCallback]', err)
      return res.redirect(`${process.env.APP_URL || 'https://garageplus.app'}/login?error=line_failed`)
    }
  }
)
