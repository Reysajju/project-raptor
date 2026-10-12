/**
 * Client Management 360 Portal — seed script
 *
 * Run with: `bun run scripts/seed.ts`
 *
 * Creates 3 demo clients with contacts, communications (email/sms/call/portal/
 * note/system), projects with tasks, files, approvals, forms, notifications,
 * integration credentials, and webhook events.
 */

import { db } from '../src/lib/db'

async function main() {
  console.log('Seeding Client Management 360 Portal...')

  // Clean slate
  await db.notification.deleteMany()
  await db.auditLog.deleteMany()
  await db.webhookEvent.deleteMany()
  await db.formResponse.deleteMany()
  await db.form.deleteMany()
  await db.approval.deleteMany()
  await db.task.deleteMany()
  await db.milestone.deleteMany()
  await db.fileItem.deleteMany()
  await db.attachment.deleteMany()
  await db.communication.deleteMany()
  await db.clientContact.deleteMany()
  await db.client.deleteMany()
  await db.profile.deleteMany()
  await db.integrationCredential.deleteMany()

  // ---- Team ----
  const owner = await db.profile.create({
    data: {
      email: 'alex@onboardwithus.com',
      fullName: 'Alex Mercer',
      role: 'owner',
      avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    },
  })
  const admin = await db.profile.create({
    data: {
      email: 'priya@onboardwithus.com',
      fullName: 'Priya Sharma',
      role: 'admin',
      avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    },
  })
  const admin2 = await db.profile.create({
    data: {
      email: 'marcus@onboardwithus.com',
      fullName: 'Marcus Lee',
      role: 'admin',
      avatarUrl: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    },
  })

  // ---- Clients ----
  const northwind = await db.client.create({
    data: {
      name: 'Eleanor Whitfield',
      company: 'Northwind Traders',
      status: 'active',
      tags: 'enterprise,retail',
      ownerId: owner.id,
      accentColor: 'violet',
      notes: 'Key account. Renewal in Q3.',
      customFields: JSON.stringify({ industry: 'Retail', arr: '48000' }),
    },
  })

  const contoso = await db.client.create({
    data: {
      name: 'David Chen',
      company: 'Contoso Pharmaceuticals',
      status: 'active',
      tags: 'enterprise,healthcare',
      ownerId: admin.id,
      accentColor: 'emerald',
      notes: 'Multi-region rollout. Sensitive data.',
      customFields: JSON.stringify({ industry: 'Healthcare', arr: '75000' }),
    },
  })

  const lucerne = await db.client.create({
    data: {
      name: 'Sofia Rinaldi',
      company: 'Lucerne Design Studio',
      status: 'prospect',
      tags: 'smb,design',
      ownerId: admin2.id,
      accentColor: 'sky',
      notes: 'Onboarding. Intake form pending.',
      customFields: JSON.stringify({ industry: 'Design', arr: '12000' }),
    },
  })

  // ---- Contacts ----
  const contacts = [
    { clientId: northwind.id, type: 'email', value: 'eleanor@northwind.com', label: 'work', isPrimary: true },
    { clientId: northwind.id, type: 'phone', value: '+1 (415) 555-0142', label: 'mobile', isPrimary: true },
    { clientId: northwind.id, type: 'email', value: 'ops@northwind.com', label: 'shared inbox', isPrimary: false },
    { clientId: contoso.id, type: 'email', value: 'd.chen@contoso.com', label: 'work', isPrimary: true },
    { clientId: contoso.id, type: 'phone', value: '+1 (212) 555-0199', label: 'mobile', isPrimary: true },
    { clientId: lucerne.id, type: 'email', value: 'sofia@lucerne.studio', label: 'work', isPrimary: true },
    { clientId: lucerne.id, type: 'phone', value: '+39 06 555 0123', label: 'office', isPrimary: false },
  ]
  for (const c of contacts) {
    await db.clientContact.create({
      data: {
        ...c,
        valueNormalized:
          c.type === 'email' ? c.value.toLowerCase() : c.value.replace(/[^+\d]/g, ''),
      },
    })
  }

  // Client portal users
  await db.profile.create({
    data: {
      email: 'eleanor@northwind.com',
      fullName: 'Eleanor Whitfield',
      role: 'client',
      clientId: northwind.id,
    },
  })
  await db.profile.create({
    data: {
      email: 'd.chen@contoso.com',
      fullName: 'David Chen',
      role: 'client',
      clientId: contoso.id,
    },
  })

  // ---- Helper to build comms ----
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const hours = (h: number) => new Date(now - h * 60 * 60 * 1000)

  async function comm(data: {
    clientId: string
    channel: string
    direction: string
    provider?: string
    providerMessageId?: string
    threadKey?: string
    subject?: string
    bodyText: string
    bodyHtmlSanitized?: string
    summary?: string
    transcript?: string
    audioUrl?: string
    durationSec?: number
    fromValue?: string
    toValue?: string
    status?: string
    assignedTo?: string
    visibleToClient?: boolean
    occurredAt: Date
  }) {
    return db.communication.create({
      data: {
        clientId: data.clientId,
        channel: data.channel,
        direction: data.direction,
        provider: data.provider ?? 'manual',
        providerMessageId: data.providerMessageId,
        threadKey: data.threadKey,
        subject: data.subject ?? '',
        bodyText: data.bodyText,
        bodyHtmlSanitized: data.bodyHtmlSanitized ?? data.bodyText,
        summary: data.summary,
        transcript: data.transcript,
        audioUrl: data.audioUrl,
        durationSec: data.durationSec,
        fromValue: data.fromValue ?? '',
        toValue: data.toValue ?? '',
        status: data.status ?? 'open',
        assignedTo: data.assignedTo,
        visibleToClient: data.visibleToClient ?? false,
        occurredAt: data.occurredAt,
      },
    })
  }

  // ---- Northwind communications ----
  await comm({
    clientId: northwind.id, channel: 'email', direction: 'inbound', provider: 'gmail',
    providerMessageId: 'gm_nw_1', threadKey: 'northwind-renewal',
    subject: 'Q3 Renewal — proposal review',
    bodyText: "Hi Alex,\n\nThanks for sending over the renewal proposal. We've reviewed the scope and overall it looks solid. Two items we'd like to discuss:\n\n1. The additional support hours tier — can we move from 10 to 20?\n2. The data residency clause — we need EU storage confirmed in writing.\n\nHappy to jump on a call Thursday.\n\nBest,\nEleanor",
    bodyHtmlSanitized: "<p>Hi Alex,</p><p>Thanks for sending over the renewal proposal. We've reviewed the scope and overall it looks solid. Two items we'd like to discuss:</p><ol><li>The additional support hours tier — can we move from 10 to 20?</li><li>The data residency clause — we need EU storage confirmed in writing.</li></ol><p>Happy to jump on a call Thursday.</p><p>Best,<br>Eleanor</p>",
    fromValue: 'eleanor@northwind.com', toValue: 'support@onboardwithus.com',
    status: 'open', assignedTo: owner.id, occurredAt: hours(26),
  })
  await comm({
    clientId: northwind.id, channel: 'email', direction: 'outbound', provider: 'gmail',
    providerMessageId: 'gm_nw_2', threadKey: 'northwind-renewal',
    subject: 'Re: Q3 Renewal — proposal review',
    bodyText: "Eleanor,\n\nGreat points. I'll get an updated draft with 20 support hours and a signed data-residency addendum by end of day. Thursday works on our side — I'll send a calendar invite.\n\n— Alex",
    fromValue: 'support@onboardwithus.com', toValue: 'eleanor@northwind.com',
    status: 'done', occurredAt: hours(24),
  })
  await comm({
    clientId: northwind.id, channel: 'call', direction: 'inbound', provider: 'ringcentral',
    providerMessageId: 'rc_nw_1',
    subject: 'Inbound call — Eleanor Whitfield',
    bodyText: 'Inbound call from +1 (415) 555-0142. Duration 12:04. Connected to Priya.',
    summary: 'Discussed renewal scope and EU data residency. Eleanor agreed to 20 support hours. Needs signed addendum before Thursday.',
    transcript: "[00:00] Priya: Hi Eleanor, thanks for calling.\n[00:12] Eleanor: Hi Priya. Wanted to talk through the renewal...\n[01:30] Eleanor: ...the data residency piece is the big one for us.\n[03:10] Priya: Totally understand. We can confirm EU storage in the addendum.\n[05:00] Eleanor: And support hours?\n[05:20] Priya: Bumping to 20 is fine, it'll adjust the line item.\n[11:45] Eleanor: Perfect, send the invite and I'll loop in legal.\n[12:04] Call ended.",
    audioUrl: '/mock-storage/calls/northwind-2025-rc.mp3',
    durationSec: 724, fromValue: '+14155550142', toValue: '+18005550199',
    status: 'done', occurredAt: hours(20),
  })
  await comm({
    clientId: northwind.id, channel: 'sms', direction: 'inbound', provider: 'openphone',
    providerMessageId: 'op_nw_1', threadKey: 'nw-sms',
    bodyText: 'Quick heads up — legal signed off on the addendum. You can send the final renewal.',
    fromValue: '+14155550142', toValue: '+18005550199',
    status: 'open', assignedTo: owner.id, occurredAt: hours(6),
  })
  await comm({
    clientId: northwind.id, channel: 'note', direction: 'internal',
    bodyText: 'Renewal cycle closing. Need to push final doc + addendum today. @Priya can you double check the pricing table?',
    status: 'open', assignedTo: admin.id, occurredAt: hours(3),
  })
  await comm({
    clientId: northwind.id, channel: 'system', direction: 'internal',
    bodyText: 'Project status changed: "Renewal 2025" moved from Review to Done.',
    status: 'done', occurredAt: hours(2),
  })

  // ---- Contoso communications ----
  await comm({
    clientId: contoso.id, channel: 'email', direction: 'inbound', provider: 'gmail',
    providerMessageId: 'gm_co_1', threadKey: 'contoso-rollout',
    subject: 'Multi-region rollout — phase 2',
    bodyText: "Team,\n\nPhase 1 went smoothly in NA. We're ready to greenlight phase 2 for EMEA. Key question: do we use the same validation scripts or regenerate for EMEA locales?\n\nAlso, please confirm the audit logging scope matches our compliance review.\n\nDavid",
    fromValue: 'd.chen@contoso.com', toValue: 'support@onboardwithus.com',
    status: 'open', assignedTo: admin.id, occurredAt: hours(48),
  })
  await comm({
    clientId: contoso.id, channel: 'email', direction: 'outbound', provider: 'gmail',
    providerMessageId: 'gm_co_2', threadKey: 'contoso-rollout',
    subject: 'Re: Multi-region rollout — phase 2',
    bodyText: "David,\n\nGood news on phase 1. For phase 2 we'll regenerate validation scripts for EMEA locales — there are locale-specific edge cases. Audit logging scope is identical; I'll attach the compliance matrix.\n\nPriya",
    fromValue: 'support@onboardwithus.com', toValue: 'd.chen@contoso.com',
    status: 'done', occurredAt: hours(40),
  })
  await comm({
    clientId: contoso.id, channel: 'sms', direction: 'outbound', provider: 'openphone',
    providerMessageId: 'op_co_1', threadKey: 'co-sms',
    bodyText: 'Hi David — phase 2 compliance matrix uploaded to the file vault. Let us know if anything looks off.',
    fromValue: '+18005550199', toValue: '+12125550199',
    status: 'done', occurredAt: hours(30),
  })
  await comm({
    clientId: contoso.id, channel: 'call', direction: 'outbound', provider: 'ringcentral',
    providerMessageId: 'rc_co_1',
    subject: 'Outbound call — Compliance sync',
    bodyText: 'Outbound call to David Chen. Duration 18:22. Covered phase 2 audit logging + locale validation.',
    summary: 'Walked David through audit logging scope for EMEA. Confirmed locale regeneration approach. Action: send updated compliance matrix by Friday.',
    transcript: "[00:00] Priya: David, thanks for making time.\n[00:30] David: Of course. Let's talk audit scope.\n[02:00] Priya: The scope is identical to NA — all auth events, all data exports, config changes.\n[04:15] David: Good. For locales, do we reuse the validators?\n[05:00] Priya: We'll regenerate. EMEA has edge cases around date formats and tax line items.\n[10:00] David: Makes sense. Timeline?\n[11:00] Priya: Matrix by Friday, pilot next Tuesday.\n[18:22] Call ended.",
    audioUrl: '/mock-storage/calls/contoso-2025-rc.mp3',
    durationSec: 1102, fromValue: '+18005550199', toValue: '+12125550199',
    status: 'done', occurredAt: hours(18),
  })
  await comm({
    clientId: contoso.id, channel: 'note', direction: 'internal',
    bodyText: 'David is sharp on compliance. Make sure the matrix reviewer double-checks the data-retention row before sending.',
    status: 'open', assignedTo: admin2.id, occurredAt: hours(10),
  })
  await comm({
    clientId: contoso.id, channel: 'system', direction: 'internal',
    bodyText: 'File uploaded: "compliance-matrix-emea-v3.pdf" shared with client.',
    status: 'done', occurredAt: hours(8),
  })

  // ---- Lucerne communications (prospect, onboarding) ----
  await comm({
    clientId: lucerne.id, channel: 'email', direction: 'inbound', provider: 'gmail',
    providerMessageId: 'gm_lu_1', threadKey: 'lucerne-intro',
    subject: 'Intro + a few questions',
    bodyText: "Hi Marcus,\n\nExcited to potentially work together! A few things before we move forward:\n\n- What does onboarding look like?\n- Do you support Italian-language portals?\n- Can we keep our existing brand color (#0ea5e9)?\n\nLooking forward,\nSofia",
    fromValue: 'sofia@lucerne.studio', toValue: 'support@onboardwithus.com',
    status: 'open', assignedTo: admin2.id, occurredAt: hours(50),
  })
  await comm({
    clientId: lucerne.id, channel: 'email', direction: 'outbound', provider: 'gmail',
    providerMessageId: 'gm_lu_2', threadKey: 'lucerne-intro',
    subject: 'Re: Intro + a few questions',
    bodyText: "Sofia,\n\nGreat to hear from you. Onboarding is usually 5 business days: kickoff, intake form, portal setup, first review. We can absolutely do an Italian-language portal — our content layer supports it. And yes, your brand color stays.\n\nI'll send the intake form shortly.\n\nMarcus",
    fromValue: 'support@onboardwithus.com', toValue: 'sofia@lucerne.studio',
    status: 'done', occurredAt: hours(46),
  })
  await comm({
    clientId: lucerne.id, channel: 'portal', direction: 'inbound', provider: 'portal',
    providerMessageId: 'po_lu_1',
    bodyText: 'Just filled out the intake form — let me know if you need anything else!',
    fromValue: 'sofia@lucerne.studio',
    status: 'open', assignedTo: admin2.id, visibleToClient: true, occurredAt: hours(4),
  })
  await comm({
    clientId: lucerne.id, channel: 'note', direction: 'internal',
    bodyText: 'Sofia seems keen. Let\'s move her to active by end of week if intake checks out.',
    status: 'open', assignedTo: admin2.id, occurredAt: hours(2),
  })

  // Unmatched inbound (for triage demo)
  await db.communication.create({
    data: {
      clientId: null,
      channel: 'email',
      direction: 'inbound',
      provider: 'gmail',
      providerMessageId: 'gm_unmatched_1',
      subject: 'Inquiry about services',
      bodyText: 'Hello — I run a small accounting firm and heard about your portal. Do you offer a plan for solo practitioners? — Jordan',
      bodyHtmlSanitized: '<p>Hello — I run a small accounting firm and heard about your portal. Do you offer a plan for solo practitioners? — Jordan</p>',
      fromValue: 'jordan.b@brightbooks.co',
      toValue: 'support@onboardwithus.com',
      status: 'open',
      occurredAt: hours(12),
    },
  })

  // ---- Projects ----
  const nwProject = await db.project.create({
    data: {
      clientId: northwind.id,
      title: 'Renewal 2025',
      status: 'active',
      stage: 'Review',
      dueDate: new Date(now + 5 * day),
      position: 0,
    },
  })
  await db.milestone.createMany({
    data: [
      { projectId: nwProject.id, title: 'Scope confirmed', completed: true, position: 0 },
      { projectId: nwProject.id, title: 'Proposal sent', completed: true, position: 1 },
      { projectId: nwProject.id, title: 'Addendum signed', completed: false, position: 2, dueDate: new Date(now + 1 * day) },
      { projectId: nwProject.id, title: 'Renewal countersigned', completed: false, position: 3, dueDate: new Date(now + 5 * day) },
    ],
  })
  await db.task.createMany({
    data: [
      { projectId: nwProject.id, title: 'Update pricing for 20 support hours', status: 'in_progress', assigneeId: admin.id, position: 0, dueDate: new Date(now + 1 * day) },
      { projectId: nwProject.id, title: 'Draft data residency addendum', status: 'review', assigneeId: owner.id, position: 1, dueDate: new Date(now + 2 * day) },
      { projectId: nwProject.id, title: 'Send final renewal doc', status: 'todo', assigneeId: owner.id, position: 2, dueDate: new Date(now + 4 * day) },
      { projectId: nwProject.id, title: 'Schedule Thursday call', status: 'done', assigneeId: admin.id, position: 3 },
    ],
  })

  const coProject = await db.project.create({
    data: {
      clientId: contoso.id,
      title: 'EMEA Phase 2 Rollout',
      status: 'active',
      stage: 'To Do',
      dueDate: new Date(now + 14 * day),
      position: 0,
    },
  })
  await db.milestone.createMany({
    data: [
      { projectId: coProject.id, title: 'NA phase complete', completed: true, position: 0 },
      { projectId: coProject.id, title: 'EMEA compliance matrix', completed: false, position: 1, dueDate: new Date(now + 4 * day) },
      { projectId: coProject.id, title: 'Locale validators', completed: false, position: 2, dueDate: new Date(now + 8 * day) },
      { projectId: coProject.id, title: 'EMEA pilot', completed: false, position: 3, dueDate: new Date(now + 14 * day) },
    ],
  })
  await db.task.createMany({
    data: [
      { projectId: coProject.id, title: 'Regenerate EMEA locale validators', status: 'in_progress', assigneeId: admin2.id, position: 0, dueDate: new Date(now + 6 * day) },
      { projectId: coProject.id, title: 'Finalize compliance matrix v3', status: 'review', assigneeId: admin.id, position: 1, dueDate: new Date(now + 2 * day) },
      { projectId: coProject.id, title: 'Schedule EMEA pilot', status: 'todo', assigneeId: admin.id, position: 2, dueDate: new Date(now + 10 * day) },
    ],
  })

  const luProject = await db.project.create({
    data: {
      clientId: lucerne.id,
      title: 'Onboarding',
      status: 'planning',
      stage: 'To Do',
      dueDate: new Date(now + 7 * day),
      position: 0,
    },
  })
  await db.milestone.createMany({
    data: [
      { projectId: luProject.id, title: 'Kickoff call', completed: true, position: 0 },
      { projectId: luProject.id, title: 'Intake form submitted', completed: true, position: 1 },
      { projectId: luProject.id, title: 'Portal provisioned', completed: false, position: 2, dueDate: new Date(now + 3 * day) },
      { projectId: luProject.id, title: 'First review', completed: false, position: 3, dueDate: new Date(now + 7 * day) },
    ],
  })
  await db.task.createMany({
    data: [
      { projectId: luProject.id, title: 'Provision client portal (Italian locale)', status: 'in_progress', assigneeId: admin2.id, position: 0, dueDate: new Date(now + 3 * day) },
      { projectId: luProject.id, title: 'Apply brand color #0ea5e9', status: 'todo', assigneeId: admin2.id, position: 1 },
      { projectId: luProject.id, title: 'Send welcome packet', status: 'todo', assigneeId: admin2.id, position: 2 },
    ],
  })

  // ---- Files ----
  const nwFile = await db.fileItem.create({
    data: {
      clientId: northwind.id, projectId: nwProject.id, folder: 'Renewal',
      fileName: 'renewal-proposal-v2.pdf', storagePath: '/mock-storage/files/renewal-proposal-v2.pdf',
      mimeType: 'application/pdf', sizeBytes: 482_000, version: 2,
      uploadedById: owner.id, sharedWithClient: true,
    },
  })
  await db.fileItem.create({
    data: {
      clientId: northwind.id, projectId: nwProject.id, folder: 'Renewal',
      fileName: 'data-residency-addendum-draft.pdf', storagePath: '/mock-storage/files/addendum.pdf',
      mimeType: 'application/pdf', sizeBytes: 128_000, version: 1,
      uploadedById: owner.id, sharedWithClient: false,
    },
  })
  await db.fileItem.create({
    data: {
      clientId: northwind.id, folder: 'Branding',
      fileName: 'northwind-logo.png', storagePath: '/mock-storage/files/northwind-logo.png',
      mimeType: 'image/png', sizeBytes: 92_000, version: 1,
      uploadedById: admin.id, sharedWithClient: false,
    },
  })
  const coFile = await db.fileItem.create({
    data: {
      clientId: contoso.id, projectId: coProject.id, folder: 'Compliance',
      fileName: 'compliance-matrix-emea-v3.pdf', storagePath: '/mock-storage/files/compliance-matrix-v3.pdf',
      mimeType: 'application/pdf', sizeBytes: 612_000, version: 3,
      uploadedById: admin.id, sharedWithClient: true,
    },
  })
  await db.fileItem.create({
    data: {
      clientId: contoso.id, projectId: coProject.id, folder: 'Recordings',
      fileName: 'call-transcript-contoso-2025.txt', storagePath: '/mock-storage/files/contoso-transcript.txt',
      mimeType: 'text/plain', sizeBytes: 14_000, version: 1,
      uploadedById: admin2.id, sharedWithClient: false,
    },
  })
  await db.fileItem.create({
    data: {
      clientId: lucerne.id, folder: 'Intake',
      fileName: 'intake-form-responses.pdf', storagePath: '/mock-storage/files/lucerne-intake.pdf',
      mimeType: 'application/pdf', sizeBytes: 38_000, version: 1,
      uploadedById: admin2.id, sharedWithClient: true,
    },
  })

  // ---- Approvals ----
  await db.approval.create({
    data: {
      clientId: northwind.id, projectId: nwProject.id, fileId: nwFile.id,
      title: 'Renewal Proposal v2 — client sign-off',
      status: 'pending',
    },
  })
  await db.approval.create({
    data: {
      clientId: contoso.id, projectId: coProject.id, fileId: coFile.id,
      title: 'Compliance Matrix EMEA v3 — review',
      status: 'pending',
    },
  })
  await db.approval.create({
    data: {
      clientId: northwind.id,
      title: 'Brand assets for portal',
      status: 'changes_requested',
      decidedAt: hours(30),
      comment: 'Please send the logo as a transparent PNG at 2x.',
    },
  })

  // ---- Forms ----
  const intakeForm = await db.form.create({
    data: {
      clientId: lucerne.id,
      title: 'Client Intake — Lucerne',
      description: 'A few questions to kick off onboarding.',
      schemaJson: JSON.stringify([
        { id: 'company', type: 'text', label: 'Company legal name', required: true },
        { id: 'locale', type: 'select', label: 'Preferred portal language', options: ['English', 'Italiano'], required: true },
        { id: 'accent', type: 'text', label: 'Brand color (hex)', required: false },
        { id: 'team_size', type: 'select', label: 'Team size', options: ['1-5', '6-20', '21-50', '50+'], required: true },
        { id: 'use_cases', type: 'longtext', label: 'Primary use cases', required: false },
        { id: 'consent', type: 'checkbox', label: 'I agree to the data processing terms', required: true },
      ]),
      status: 'published',
    },
  })
  await db.formResponse.create({
    data: {
      formId: intakeForm.id, clientId: lucerne.id,
      answersJson: JSON.stringify({
        company: 'Lucerne Design Studio S.r.l.',
        locale: 'Italiano',
        accent: '#0ea5e9',
        team_size: '1-5',
        use_cases: 'Client approvals, file sharing, intake forms.',
        consent: true,
      }),
      status: 'submitted',
    },
  })

  // ---- Notifications ----
  await db.notification.createMany({
    data: [
      { userId: owner.id, type: 'assignment', title: 'New inbound email', body: 'Eleanor Whitfield replied on the renewal thread.', payloadJson: JSON.stringify({ clientId: northwind.id, channel: 'email' }) },
      { userId: owner.id, type: 'assignment', title: 'SMS from client', body: 'Northwind: legal signed off on the addendum.', payloadJson: JSON.stringify({ clientId: northwind.id, channel: 'sms' }) },
      { userId: owner.id, type: 'approval', title: 'Approval requested', body: 'Renewal Proposal v2 awaiting client sign-off.', payloadJson: JSON.stringify({ clientId: northwind.id }) },
      { userId: admin.id, type: 'assignment', title: 'Call transcript ready', body: 'Contoso compliance call transcript is ready.', payloadJson: JSON.stringify({ clientId: contoso.id }) },
      { userId: admin2.id, type: 'triage', title: 'Unmatched sender', body: 'jordan.b@brightbooks.co sent an inquiry — link to a client.', payloadJson: JSON.stringify({ commId: 'gm_unmatched_1' }) },
      { userId: admin2.id, type: 'form', title: 'Intake form submitted', body: 'Lucerne submitted the intake form.', payloadJson: JSON.stringify({ clientId: lucerne.id }) },
    ],
  })

  // ---- Integration credentials ----
  await db.integrationCredential.createMany({
    data: [
      { provider: 'gmail', status: 'connected', accountLabel: 'support@onboardwithus.com', lastSyncAt: hours(1), watchExpiresAt: new Date(now + 6 * day) },
      { provider: 'openphone', status: 'connected', accountLabel: '+1 800 555 0199', lastSyncAt: hours(2) },
      { provider: 'ringcentral', status: 'connected', accountLabel: 'Onboard With Us (sandbox)', lastSyncAt: hours(2), watchExpiresAt: new Date(now + 9 * day) },
    ],
  })

  // ---- Webhook events ----
  await db.webhookEvent.createMany({
    data: [
      { provider: 'gmail', eventId: 'evt_gm_001', eventType: 'message.received', rawJson: JSON.stringify({ from: 'eleanor@northwind.com', subject: 'Q3 Renewal' }), status: 'processed' },
      { provider: 'openphone', eventId: 'evt_op_001', eventType: 'message.received', rawJson: JSON.stringify({ from: '+14155550142', body: 'Quick heads up' }), status: 'processed' },
      { provider: 'ringcentral', eventId: 'evt_rc_001', eventType: 'call.completed', rawJson: JSON.stringify({ from: '+14155550142', duration: 724 }), status: 'processed' },
      { provider: 'ringcentral', eventId: 'evt_rc_002', eventType: 'call.recording.completed', rawJson: JSON.stringify({ callId: 'rc_nw_1' }), status: 'received' },
    ],
  })

  // ---- Audit log ----
  await db.auditLog.createMany({
    data: [
      { actorId: owner.id, action: 'client.created', entity: 'client', entityId: northwind.id, metadataJson: JSON.stringify({ name: 'Eleanor Whitfield' }) },
      { actorId: admin.id, action: 'client.created', entity: 'client', entityId: contoso.id, metadataJson: JSON.stringify({ name: 'David Chen' }) },
      { actorId: admin2.id, action: 'client.created', entity: 'client', entityId: lucerne.id, metadataJson: JSON.stringify({ name: 'Sofia Rinaldi' }) },
      { actorId: owner.id, action: 'integration.connect', entity: 'integration', entityId: 'gmail', metadataJson: JSON.stringify({ account: 'support@onboardwithus.com' }) },
      { actorId: owner.id, action: 'integration.connect', entity: 'integration', entityId: 'openphone', metadataJson: JSON.stringify({ number: '+18005550199' }) },
      { actorId: owner.id, action: 'integration.connect', entity: 'integration', entityId: 'ringcentral', metadataJson: JSON.stringify({ account: 'sandbox' }) },
      { actorId: admin.id, action: 'approval.request', entity: 'approval', entityId: 'nw_appr', metadataJson: JSON.stringify({ title: 'Renewal Proposal v2' }) },
    ],
  })

  console.log('Seed complete.')
  console.log('  Clients: 3 (Northwind, Contoso, Lucerne)')
  console.log('  Communications: ~18 (email/sms/call/portal/note/system)')
  console.log('  Projects: 3 with milestones + tasks')
  console.log('  Files: 6, Approvals: 3, Forms: 1, Notifications: 6')
  console.log('  Integrations: 3 connected, Webhook events: 4, Audit log: 8')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
