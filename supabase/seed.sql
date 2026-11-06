-- ════════════════════════════════════════════════════════════════════
-- Questivity LMS — starter content
-- Safe to run once on a fresh database (after the migrations).
-- Articles marked DRAFT contain [placeholders] that HR/IT must complete
-- before publishing — the assistant only ever answers from PUBLISHED articles.
-- ════════════════════════════════════════════════════════════════════

update public.org_settings set allowed_email_domains = '{questivity.com}', quiz_pass_mark = 70 where id;

insert into public.departments (name) values
  ('Network Engineering'), ('Cloud & Virtualization'), ('Security'), ('Service Desk'),
  ('Presales & Solutions'), ('Sales'), ('Project Management'), ('HR & Operations'), ('Finance')
on conflict do nothing;

-- ─── Seed helpers (session-only) ────────────────────────────────────
create or replace function pg_temp.course(p_slug text, p_title text, p_summary text, p_category text,
  p_level text, p_minutes int, p_mandatory boolean, p_desc text)
returns void language sql as $$
  insert into public.courses (slug, title, summary, category, level, duration_minutes, is_mandatory, status, description_md)
  values (p_slug, p_title, p_summary, p_category, p_level, p_minutes, p_mandatory, 'published', p_desc)
  on conflict (slug) do nothing;
$$;

create or replace function pg_temp.module(p_course text, p_pos int, p_title text)
returns void language sql as $$
  insert into public.course_modules (course_id, position, title)
  select id, p_pos, p_title from public.courses where slug = p_course;
$$;

create or replace function pg_temp.lesson(p_course text, p_module_pos int, p_pos int, p_title text,
  p_kind public.lesson_kind, p_minutes int, p_body text)
returns void language sql as $$
  insert into public.lessons (course_id, module_id, position, title, kind, duration_minutes, body_md)
  select c.id, m.id, p_pos, p_title, p_kind, p_minutes, p_body
  from public.courses c join public.course_modules m on m.course_id = c.id and m.position = p_module_pos
  where c.slug = p_course;
$$;

create or replace function pg_temp.q(p_course text, p_lesson text, p_pos int, p_prompt text,
  p_options jsonb, p_correct int, p_expl text)
returns void language sql as $$
  insert into public.quiz_questions (lesson_id, position, prompt, options, correct_index, explanation)
  select l.id, p_pos, p_prompt, p_options, p_correct, p_expl
  from public.lessons l join public.courses c on c.id = l.course_id
  where c.slug = p_course and l.title = p_lesson;
$$;

-- ════════════════════════════════════════════════════════════════════
-- COURSE 1 — Welcome to Questivity (mandatory onboarding)
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('welcome-to-questivity', 'Welcome to Questivity',
  'Who we are, what we deliver, how we engage with customers and what your first 90 days look like.',
  'Onboarding', 'Beginner', 45, true,
  'Your starting point at Questivity. By the end of this course you will be able to explain what Questivity does, name our key technology partners, describe our three engagement models and plan your first 90 days.');

select pg_temp.module('welcome-to-questivity', 1, 'Who we are');
select pg_temp.module('welcome-to-questivity', 2, 'How we work');
select pg_temp.module('welcome-to-questivity', 3, 'Check your understanding');

select pg_temp.lesson('welcome-to-questivity', 1, 1, 'About Questivity', 'article', 10, $md$
## What Questivity does

Questivity provides **IT infrastructure solutions and services** to medium and large enterprise customers. Headquartered in Santa Clara, California, we design, supply, deploy and manage the technology that keeps our customers' businesses running.

Our work falls into four areas:

| Area | What it means for the customer |
|---|---|
| **IT Products** | Best-of-breed hardware and software from leading vendors, at competitive prices |
| **IT Solutions** | Complete datacenter and network solutions — networking, security, wireless, servers, storage, virtualization, collaboration and SAP infrastructure |
| **IT Services** | Design, configuration, installation and deployment; staff augmentation; fully managed services |
| **Training** | Instructor-led training on datacenter technologies, delivered by certified faculty with access to our lab |

## Our promise

We are **customer focused**. The goal on every engagement is to solve the client's problem in the most efficient way and within budget. Questivity has built its reputation on designing smart, cost-effective solutions and on bringing customers significant savings.

## What this means for you

Whatever your role — engineer, project manager, sales, service desk or operations — you represent that promise. Ask "what problem is the customer really trying to solve?" before you ask "what should we sell or build?".
$md$);

select pg_temp.lesson('welcome-to-questivity', 1, 2, 'Our technology partners', 'article', 10, $md$
## Why partners matter

Questivity is vendor-aware but customer-first. Deep partnerships give us access to pricing, engineering support, early product information and certification programs — which we turn into better outcomes for customers.

## Partner ecosystem

- **Networking & wireless:** Cisco, Cisco Meraki, Juniper Networks, Arista, Aruba (HPE), Ruckus
- **Security:** Palo Alto Networks, Fortinet, Zscaler, Aurascape (AI security)
- **Compute & storage:** Dell, HPE, Lenovo, ASUS
- **Virtualization & data protection:** VMware, Veeam
- **Cloud:** Amazon Web Services, Microsoft Azure, Google Cloud, Microsoft
- **Power & datacenter facilities:** Eaton, APC by Schneider Electric

## How to use this knowledge

1. Learn the *positioning* of each partner: what problem it is best at, where it competes.
2. Never recommend a product only because of a partnership — recommend it because it fits.
3. Pursue at least one partner certification relevant to your role in your first year. Your manager will help you choose.
$md$);

select pg_temp.lesson('welcome-to-questivity', 2, 1, 'Our engagement model', 'article', 10, $md$
## Three ways we engage

### 1. Solution deployment
A defined project: **design → configure → install → deploy**. We own the outcome from requirements through handover. Typical examples: datacenter refresh, campus network rollout, firewall migration, virtualization platform build.

### 2. Staff augmentation
We place skilled Questivity engineers inside the customer's team for a period of time. The customer directs the day-to-day work; we remain responsible for the quality and conduct of our people.

### 3. Managed services
We take over the ongoing management of some or all of the customer's IT infrastructure — monitoring, incident response, patching, changes and reporting — under an agreed service level.

## Choosing the right model

| Customer situation | Best fit |
|---|---|
| Clear project with an end date | Solution deployment |
| Strong internal team, short of hands or a niche skill | Staff augmentation |
| Wants to stop running infrastructure day-to-day | Managed services |

Many customers start with a deployment project and move to managed services once they trust our delivery.
$md$);

select pg_temp.lesson('welcome-to-questivity', 2, 2, 'Your first 90 days', 'article', 10, $md$
## Days 1–30: Learn
- Complete the **New Joinee Onboarding** path in Questivity LMS (it is already assigned to you).
- Meet your manager, your team and your buddy.
- Read the knowledge-base articles for your department.
- Get access to every tool you need. If anything is missing, ask the Quest Assistant first, then your manager.

## Days 31–60: Contribute
- Shadow at least two customer engagements or service-desk shifts.
- Start the technical learning path for your role (Network Engineer, Cloud & Virtualization, or the path your manager assigns).
- Write or improve one knowledge-base article — the fastest way to learn is to explain.

## Days 61–90: Own
- Take ownership of a defined piece of work.
- Agree goals for the next six months with your manager, including a certification target.

> **Tip:** Ask the Quest Assistant any time. If it cannot find an answer, that question is automatically flagged to the knowledge-base team so the next joiner gets an answer.
$md$);

select pg_temp.lesson('welcome-to-questivity', 3, 1, 'Orientation quiz', 'quiz', 5, 'Answer all questions. You need the pass mark to complete the course; you can retake as often as you like.');
select pg_temp.q('welcome-to-questivity', 'Orientation quiz', 1, 'Which customer segment does Questivity primarily serve?',
  '["Consumers and home users", "Medium and large enterprises", "Only government agencies", "Start-ups only"]', 1,
  'Questivity provides IT infrastructure solutions and services to medium and large enterprise customers.');
select pg_temp.q('welcome-to-questivity', 'Orientation quiz', 2, 'A customer has a strong in-house team but needs an extra firewall specialist for six months. Which engagement model fits best?',
  '["Solution deployment", "Managed services", "Staff augmentation", "Training only"]', 2,
  'Staff augmentation places Questivity engineers inside the customer''s team while the customer directs day-to-day work.');
select pg_temp.q('welcome-to-questivity', 'Orientation quiz', 3, 'What are the stages of a Questivity solution deployment?',
  '["Sell, ship, invoice", "Design, configure, install, deploy", "Plan, outsource, review", "Install, then design"]', 1,
  'Solution deployment covers design, configuration, installation and deployment through to handover.');
select pg_temp.q('welcome-to-questivity', 'Orientation quiz', 4, 'Which of these is a Questivity security partner?',
  '["Palo Alto Networks", "Eaton", "Veeam", "Lenovo"]', 0,
  'Palo Alto Networks, Fortinet, Zscaler and Aurascape are security partners. Eaton is power, Veeam data protection, Lenovo compute.');
select pg_temp.q('welcome-to-questivity', 'Orientation quiz', 5, 'What should you ask before deciding what to sell or build?',
  '["Which vendor gives the highest margin?", "What problem is the customer really trying to solve?", "What did we sell last time?", "What is quickest for us?"]', 1,
  'Customer focus means solving the real problem efficiently and within budget.');

-- ════════════════════════════════════════════════════════════════════
-- COURSE 2 — Information Security Essentials (mandatory)
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('information-security-essentials', 'Information Security Essentials',
  'Protect Questivity and our customers: passwords and MFA, phishing, data handling, AI tools and incident reporting.',
  'Compliance', 'Beginner', 40, true,
  'Every Questivity employee has privileged access to customer environments. This course covers the security habits we expect from everyone, every day.');

select pg_temp.module('information-security-essentials', 1, 'Everyday security');
select pg_temp.module('information-security-essentials', 2, 'Handling data and incidents');
select pg_temp.module('information-security-essentials', 3, 'Assessment');

select pg_temp.lesson('information-security-essentials', 1, 1, 'Passwords, MFA and access', 'article', 8, $md$
## Passwords
- Use a **password manager** and a unique passphrase for every system.
- Minimum 14 characters for anything important. Length beats complexity.
- Never reuse a customer credential anywhere else, never store it in email, chat or a spreadsheet.

## Multi-factor authentication (MFA)
- MFA is required wherever it is available — company accounts, customer portals, vendor partner portals.
- Prefer an authenticator app or hardware key over SMS.
- **Never approve an MFA prompt you did not start.** Repeated unexpected prompts ("MFA fatigue") mean someone has your password — report it immediately.

## Least privilege
Request only the access you need for the task, for as long as you need it. When an engagement ends, make sure your access to the customer environment is removed.
$md$);

select pg_temp.lesson('information-security-essentials', 1, 2, 'Recognising phishing and social engineering', 'article', 8, $md$
## Red flags
- Urgency or pressure ("the CEO needs this in 10 minutes").
- Requests to change bank details, buy gift cards or bypass a process.
- Sender address or link domain that is *almost* right.
- Unexpected attachments, especially macros, archives or HTML files.
- A "vendor" or "customer" asking for credentials, remote access or configuration files.

## What to do
1. Do not click, reply or open attachments.
2. Verify through a **separate, known channel** — call the person on a number you already have.
3. Report the message using the process in the *Reporting a security incident* article.

Engineers are high-value targets because of the access we hold to customer networks. Treat unexpected requests for configs, VPN profiles or firewall changes with suspicion.
$md$);

select pg_temp.lesson('information-security-essentials', 2, 1, 'Data classification and handling', 'article', 8, $md$
## Classification levels
| Level | Examples | Handling |
|---|---|---|
| **Public** | Website content, published datasheets | No restrictions |
| **Internal** | Internal procedures, org charts | Share inside Questivity only |
| **Confidential** | Customer network diagrams, pricing, contracts, HR records | Need-to-know; encrypted storage and transfer |
| **Restricted** | Credentials, private keys, customer personal data | Strictly need-to-know; never in email, chat, tickets or AI tools |

## Customer data rules
- Customer configurations, diagrams and logs stay in approved repositories — never on personal devices or personal cloud storage.
- Sanitise configs (remove passwords, keys, public IPs) before sharing them, even internally.
- Delete or return customer data at the end of an engagement as the contract requires.
$md$);

select pg_temp.lesson('information-security-essentials', 2, 2, 'AI tools and reporting incidents', 'article', 8, $md$
## Using AI tools safely
AI assistants are useful, but anything you paste into an unapproved tool may leave our control.
- Use only **company-approved AI tools** for work.
- Never paste Restricted data (credentials, keys, personal data) into any AI tool.
- Never paste Confidential customer data into an AI tool unless the tool is approved for that data class.
- You remain responsible for checking AI output — especially configurations and commands — before using it.

## Reporting an incident
Report immediately if you suspect: a lost or stolen device, a clicked phishing link, an approved MFA prompt you didn't start, malware, data sent to the wrong person, or unusual activity in a customer environment.

**Speed matters more than certainty.** Report first; investigation comes later. You will never be penalised for reporting in good faith.
$md$);

select pg_temp.lesson('information-security-essentials', 3, 1, 'Security assessment', 'quiz', 6, 'Pass mark applies. Retakes are unlimited.');
select pg_temp.q('information-security-essentials', 'Security assessment', 1, 'You receive an MFA approval prompt you did not trigger. What should you do?',
  '["Approve it so it stops", "Ignore it", "Deny it and report it immediately — your password may be compromised", "Turn off MFA"]', 2,
  'Unexpected MFA prompts usually mean someone has your password. Deny and report.');
select pg_temp.q('information-security-essentials', 'Security assessment', 2, 'Which item is classified as Restricted?',
  '["A published product datasheet", "A customer firewall admin password", "The internal org chart", "Our website homepage"]', 1,
  'Credentials and private keys are Restricted and must never be shared in email, chat, tickets or AI tools.');
select pg_temp.q('information-security-essentials', 'Security assessment', 3, 'A "vendor" emails asking you to urgently send a customer''s VPN configuration. Best response?',
  '["Send it — vendors are trusted", "Verify through a separate known channel before doing anything", "Forward it to the customer", "Reply asking for their password"]', 1,
  'Verify unexpected requests through an independent channel. Engineers are prime social-engineering targets.');
select pg_temp.q('information-security-essentials', 'Security assessment', 4, 'Can you paste a customer''s running config with passwords into a public AI chatbot to debug it?',
  '["Yes, if you delete the chat afterwards", "Yes, AI tools are private", "No — never paste Restricted data into AI tools, and use only approved tools", "Only on weekends"]', 2,
  'Credentials are Restricted; only approved tools may be used and never with Restricted data.');
select pg_temp.q('information-security-essentials', 'Security assessment', 5, 'You think you may have clicked a phishing link but are not sure. What now?',
  '["Wait to see if anything happens", "Report it immediately — speed matters more than certainty", "Clear your browser history", "Tell a colleague only"]', 1,
  'Report first; good-faith reports are never penalised.');

-- ════════════════════════════════════════════════════════════════════
-- COURSE 3 — Customer Delivery Fundamentals
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('customer-delivery-fundamentals', 'Customer Delivery Fundamentals',
  'How Questivity delivers: project lifecycle, change management, documentation, handover and service levels.',
  'Delivery', 'Beginner', 50, false,
  'Consistent delivery is what turns a first project into a long-term managed-services relationship. Learn the lifecycle and the disciplines every engineer and project manager follows.');

select pg_temp.module('customer-delivery-fundamentals', 1, 'The delivery lifecycle');
select pg_temp.module('customer-delivery-fundamentals', 2, 'Running services');
select pg_temp.module('customer-delivery-fundamentals', 3, 'Assessment');

select pg_temp.lesson('customer-delivery-fundamentals', 1, 1, 'Design, configure, install, deploy', 'article', 12, $md$
## 1. Design
- Capture requirements: business goals, current state, constraints (budget, downtime windows, compliance).
- Produce a **high-level design** (HLD) for agreement, then a **low-level design** (LLD) with addressing, VLANs, naming, configurations.
- Record assumptions and risks. Get written customer sign-off before ordering.

## 2. Configure
- Stage and pre-configure equipment in the lab where possible.
- Use configuration templates and version control. Peer-review every configuration.

## 3. Install
- Confirm site readiness: rack space, power, cooling, cabling, access.
- Label everything. Photograph racks before and after.

## 4. Deploy
- Execute under an approved **change** with a tested rollback plan.
- Run agreed acceptance tests with the customer.
- Hand over: as-built documentation, credentials through the agreed secure method, support contacts.
$md$);

select pg_temp.lesson('customer-delivery-fundamentals', 1, 2, 'Change management in practice', 'article', 12, $md$
## Why change control exists
Most outages are caused by changes. Change management makes every change **planned, reviewed, approved, reversible and recorded**.

## Change types
| Type | Description | Approval |
|---|---|---|
| **Standard** | Pre-approved, low-risk, repeatable (e.g. adding a VLAN to an access port from a template) | Pre-approved |
| **Normal** | Planned change with some risk | Change advisory review before the window |
| **Emergency** | Needed to restore service or close an active security risk | Expedited approval, documented afterwards |

## A good change record includes
1. What, why, and which systems are affected.
2. Implementation steps (exact commands where practical).
3. **Rollback plan** and the trigger for using it.
4. Test plan to prove success.
5. Window, customer approver, and communication plan.

Always follow the *customer's* change process when working in their environment — it takes precedence over ours.
$md$);

select pg_temp.lesson('customer-delivery-fundamentals', 2, 1, 'Incidents, priorities and SLAs', 'article', 12, $md$
## Incident vs request vs problem
- **Incident:** unplanned interruption or degradation of a service.
- **Service request:** a standard ask (new user, access, information).
- **Problem:** the underlying cause of one or more incidents.

## Priority = impact × urgency
| Priority | Typical example |
|---|---|
| **P1 – Critical** | Datacenter, core network or business-critical service down for many users |
| **P2 – High** | Major degradation or a critical service down for a site or team |
| **P3 – Medium** | Single user or non-critical service affected; workaround exists |
| **P4 – Low** | Minor issue, question or cosmetic fault |

The actual response and resolution targets are set **in each customer's contract**. Always check the contract SLA for the customer you are working on.

## Good ticket hygiene
- Update the ticket every time you act — the next engineer must be able to pick it up cold.
- Record root cause and fix on closure, and suggest a knowledge-base article for anything likely to recur.
$md$);

select pg_temp.lesson('customer-delivery-fundamentals', 2, 2, 'Documentation and handover', 'article', 8, $md$
## As-built documentation
At the end of every deployment the customer receives:
- Final network/system diagrams reflecting what was actually built.
- Device inventory (model, serial, firmware, location, management IP).
- Configuration backups (credentials removed).
- Operational notes: how to back up, restore, update firmware, and who to call.

## Knowledge capture
Anything you had to figure out the hard way belongs in the knowledge base. Write it while it is fresh — it takes ten minutes and saves the next person hours.
$md$);

select pg_temp.lesson('customer-delivery-fundamentals', 3, 1, 'Delivery assessment', 'quiz', 5, 'Pass mark applies. Retakes are unlimited.');
select pg_temp.q('customer-delivery-fundamentals', 'Delivery assessment', 1, 'What must every normal change include besides implementation steps?',
  '["A rollback plan and test plan", "Only the window", "A sales quote", "Nothing else"]', 0,
  'Every change needs a rollback plan and a way to prove success.');
select pg_temp.q('customer-delivery-fundamentals', 'Delivery assessment', 2, 'You are working in a customer environment whose change process differs from ours. Which applies?',
  '["Ours", "Theirs", "Whichever is faster", "Neither"]', 1,
  'The customer''s change process takes precedence in their environment.');
select pg_temp.q('customer-delivery-fundamentals', 'Delivery assessment', 3, 'The core network at a customer site is down for all users. What priority is this typically?',
  '["P4", "P3", "P2", "P1"]', 3,
  'Business-critical services down for many users is P1 – Critical.');
select pg_temp.q('customer-delivery-fundamentals', 'Delivery assessment', 4, 'Where do you find the response and resolution targets for a specific customer?',
  '["The customer''s contract SLA", "A generic internet article", "Your memory", "The vendor datasheet"]', 0,
  'Targets differ per customer and are defined in the contract.');

-- ════════════════════════════════════════════════════════════════════
-- COURSE 4 — Enterprise Networking Foundations
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('enterprise-networking-foundations', 'Enterprise Networking Foundations',
  'Core switching and routing for campus and datacenter: OSI/TCP-IP, VLANs and trunking, routing and switch hardening.',
  'Networking', 'Intermediate', 90, false,
  'The networking baseline expected of every Questivity network engineer. Vendor-neutral concepts with Cisco-style examples.');

select pg_temp.module('enterprise-networking-foundations', 1, 'Models and switching');
select pg_temp.module('enterprise-networking-foundations', 2, 'Routing and hardening');
select pg_temp.module('enterprise-networking-foundations', 3, 'Assessment');

select pg_temp.lesson('enterprise-networking-foundations', 1, 1, 'OSI and TCP/IP models', 'article', 15, $md$
## Why models matter
Models give you a **troubleshooting order**. Work bottom-up (physical first) for "nothing works", top-down for "one application is slow".

| OSI layer | Name | Examples | Typical checks |
|---|---|---|---|
| 7–5 | Application / Presentation / Session | HTTP, DNS, TLS | App logs, certificate errors |
| 4 | Transport | TCP, UDP, ports | Firewall rules, `telnet`/`nc` to port |
| 3 | Network | IP, routing, ICMP | `ping`, `traceroute`, routing table |
| 2 | Data link | Ethernet, VLANs, MAC, STP | MAC table, VLAN membership, trunk status |
| 1 | Physical | Cables, optics, power | Link lights, interface errors, optic levels |

TCP/IP collapses these into four layers: Link, Internet, Transport, Application.
$md$);

select pg_temp.lesson('enterprise-networking-foundations', 1, 2, 'VLANs, trunks and spanning tree', 'article', 20, $md$
## VLANs
A VLAN is a separate Layer-2 broadcast domain on shared switches. Use VLANs to separate users, voice, servers, management and guests.

```text
vlan 20
 name USERS
vlan 30
 name VOICE
interface GigabitEthernet1/0/10
 switchport mode access
 switchport access vlan 20
 switchport voice vlan 30
 spanning-tree portfast
```

## Trunks (802.1Q)
Trunks carry multiple VLANs between switches, tagging frames with the VLAN ID.
- **Prune** trunks to only the VLANs required (`switchport trunk allowed vlan 20,30,99`).
- Change the native VLAN from 1 to an unused VLAN and never put users on it.

## Spanning Tree Protocol
STP prevents Layer-2 loops by blocking redundant paths.
- Use Rapid PVST+ or MST.
- **Set the root bridge deliberately** on your core/distribution switches — never let it be elected by accident.
- Enable **BPDU Guard** on access ports with PortFast so a rogue switch or loop shuts the port down.
$md$);

select pg_temp.lesson('enterprise-networking-foundations', 2, 1, 'Routing essentials', 'article', 20, $md$
## How a router decides
1. **Longest prefix match** wins (a /24 beats a /16).
2. If prefixes are equal, lowest **administrative distance** wins (connected 0, static 1, eBGP 20, OSPF 110).
3. Within one protocol, lowest **metric** wins.

## Static routes
Good for stubs and defaults. Use a floating static (higher AD) as backup:
```text
ip route 0.0.0.0 0.0.0.0 203.0.113.1
ip route 0.0.0.0 0.0.0.0 198.51.100.1 250
```

## OSPF basics
- Link-state protocol; areas reduce flooding. Area 0 is the backbone and all areas connect to it.
- Use passive interfaces on user-facing networks so no adjacency forms there.
- Common adjacency failures: mismatched area, subnet/mask, hello/dead timers, MTU, or authentication.
```text
router ospf 1
 router-id 10.0.0.1
 passive-interface default
 no passive-interface TenGigabitEthernet1/1/1
 network 10.0.0.0 0.0.255.255 area 0
```
$md$);

select pg_temp.lesson('enterprise-networking-foundations', 2, 2, 'Switch baseline hardening', 'article', 15, $md$
## Minimum baseline for any managed switch
- **Management plane:** SSH v2 only, disable Telnet and HTTP; restrict management access with an ACL to the management network.
- **AAA:** centralised authentication (TACACS+/RADIUS) with a local fallback account stored in the password manager.
- **Unused ports:** shut down and place in an unused "parking" VLAN.
- **Access ports:** PortFast + BPDU Guard; port security or 802.1X where required.
- **Logging and time:** NTP to an authoritative source; syslog to the central collector; timestamps on logs.
- **SNMP:** v3 with authentication and privacy; remove default communities.
- **Banner:** a legal "authorised access only" login banner.
- **Backups:** configuration archived after every change.

See the knowledge-base runbook *Cisco switch baseline hardening* for a full template.
$md$);

select pg_temp.lesson('enterprise-networking-foundations', 3, 1, 'Networking assessment', 'quiz', 8, 'Pass mark applies. Retakes are unlimited.');
select pg_temp.q('enterprise-networking-foundations', 'Networking assessment', 1, 'A router has routes to 10.1.0.0/16 (OSPF) and 10.1.5.0/24 (static). Which is used for 10.1.5.20?',
  '["The /16 because OSPF is dynamic", "The /24 because longest prefix match wins", "Both, load-balanced", "Neither"]', 1,
  'Longest prefix match is evaluated before administrative distance.');
select pg_temp.q('enterprise-networking-foundations', 'Networking assessment', 2, 'What does BPDU Guard do on an access port?',
  '["Speeds up DHCP", "Error-disables the port if a BPDU is received", "Encrypts traffic", "Tags frames with VLAN 1"]', 1,
  'BPDU Guard shuts the port when a BPDU arrives, protecting against rogue switches and loops.');
select pg_temp.q('enterprise-networking-foundations', 'Networking assessment', 3, 'Which is NOT a common cause of an OSPF adjacency failure?',
  '["Mismatched area ID", "Mismatched hello/dead timers", "Mismatched MTU", "Different hostnames"]', 3,
  'Hostnames do not affect OSPF adjacencies.');
select pg_temp.q('enterprise-networking-foundations', 'Networking assessment', 4, 'What is the recommended practice for the native VLAN on trunks?',
  '["Keep VLAN 1 and put users on it", "Change it to an unused VLAN with no users", "Disable all VLANs", "Use the voice VLAN"]', 1,
  'Use an unused native VLAN to reduce VLAN-hopping risk.');
select pg_temp.q('enterprise-networking-foundations', 'Networking assessment', 5, 'Which management protocol should be enabled on a hardened switch?',
  '["Telnet", "HTTP", "SSH version 2", "SNMP v1 with community public"]', 2,
  'SSH v2 only; disable Telnet/HTTP and use SNMPv3.');

-- ════════════════════════════════════════════════════════════════════
-- COURSE 5 — Network Security & Firewalls
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('network-security-firewalls', 'Network Security & Next-Generation Firewalls',
  'Firewall fundamentals, NGFW policy design, segmentation and the shift to zero trust and SASE.',
  'Security', 'Intermediate', 75, false,
  'Covers the concepts behind the security platforms Questivity deploys — Palo Alto Networks, Fortinet, Cisco and Zscaler — so you can design clean, auditable policy on any of them.');

select pg_temp.module('network-security-firewalls', 1, 'Firewall fundamentals');
select pg_temp.module('network-security-firewalls', 2, 'Modern architectures');
select pg_temp.module('network-security-firewalls', 3, 'Assessment');

select pg_temp.lesson('network-security-firewalls', 1, 1, 'From packet filters to NGFW', 'article', 15, $md$
## Evolution
- **Packet filter (ACL):** allows/denies on IPs and ports. Stateless.
- **Stateful firewall:** tracks connections; return traffic is allowed automatically.
- **Next-generation firewall (NGFW):** adds application identification, user identity, intrusion prevention (IPS), URL filtering, malware and TLS inspection.

## Zones
Interfaces are grouped into **security zones** (e.g. INSIDE, DMZ, OUTSIDE, GUEST, MGMT). Policies are written *between zones*. Traffic between zones is denied unless a rule allows it.

## Platforms you will meet
| Vendor | Platform |
|---|---|
| Palo Alto Networks | PA-Series / VM-Series, managed with Panorama |
| Fortinet | FortiGate, managed with FortiManager |
| Cisco | Secure Firewall (FTD/ASA), managed with FMC |
$md$);

select pg_temp.lesson('network-security-firewalls', 1, 2, 'Writing good firewall policy', 'article', 20, $md$
## Principles
1. **Default deny.** Allow only what is required.
2. **Specific beats broad.** Use application and named service objects, not "any/any".
3. **Order matters.** Most firewalls evaluate top-down, first match wins. Put specific rules above general ones.
4. **Every rule has an owner, a ticket and a review date** in its description.
5. **Log** allowed and denied traffic for critical zones.
6. **Clean up.** Remove shadowed, unused and expired rules regularly — hit counters show what is unused.

## Rule request checklist
Source zone/address, destination zone/address, application or port, business justification, requester, owner, expiry date (for temporary rules).

## Common mistakes
- Allowing "any" service because the app's ports are unknown — instead, use App-ID/application signatures or capture traffic first.
- Exposing management interfaces to the internet.
- Disabling inspection to "fix" an application without a documented exception.
$md$);

select pg_temp.lesson('network-security-firewalls', 2, 1, 'Zero trust and SASE', 'article', 20, $md$
## Zero trust in one sentence
**Never trust, always verify** — access is granted per request based on identity, device posture and context, not network location.

## Building blocks
- Strong identity (SSO + MFA) for every user and service.
- Device posture checks (managed, patched, encrypted).
- Micro-segmentation inside the datacenter so a compromise cannot spread laterally.
- Continuous monitoring.

## SASE and SSE
**Secure Access Service Edge (SASE)** combines networking (SD-WAN) and cloud-delivered security. The security part — **Security Service Edge (SSE)** — includes:
- **SWG** (secure web gateway)
- **CASB** (cloud app security)
- **ZTNA** (zero trust network access, replacing traditional VPN for private apps)

Zscaler is a leading cloud SSE platform; Palo Alto Networks (Prisma Access) and Fortinet also offer SASE. AI usage is a new frontier: platforms such as Aurascape give visibility and control over employee AI tools and enterprise AI agents.
$md$);

select pg_temp.lesson('network-security-firewalls', 3, 1, 'Security architecture assessment', 'quiz', 6, 'Pass mark applies. Retakes are unlimited.');
select pg_temp.q('network-security-firewalls', 'Security architecture assessment', 1, 'What does a stateful firewall add over a packet filter?',
  '["Application identification", "Connection tracking so return traffic is allowed automatically", "Wireless management", "Routing protocols"]', 1,
  'Stateful firewalls track sessions; NGFWs add application/user awareness on top.');
select pg_temp.q('network-security-firewalls', 'Security architecture assessment', 2, 'Firewall rules are evaluated top-down, first match wins. Where should a specific allow rule go relative to a broad deny?',
  '["Below it", "Above it", "It does not matter", "In a different zone"]', 1,
  'Specific rules must sit above broader rules or they will never be hit.');
select pg_temp.q('network-security-firewalls', 'Security architecture assessment', 3, 'What does ZTNA typically replace?',
  '["Email", "Traditional remote-access VPN for private applications", "DNS", "Spanning tree"]', 1,
  'ZTNA grants per-application access based on identity and posture instead of network-level VPN access.');
select pg_temp.q('network-security-firewalls', 'Security architecture assessment', 4, 'Which belongs in every firewall rule description?',
  '["The engineer''s favourite colour", "Owner, ticket reference and review/expiry date", "Nothing", "The device serial number"]', 1,
  'Ownership and review dates keep the rulebase auditable and clean.');

-- ════════════════════════════════════════════════════════════════════
-- COURSE 6 — Virtualization & Cloud Essentials
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('virtualization-cloud-essentials', 'Virtualization & Cloud Essentials',
  'Hypervisors, VMware vSphere concepts, snapshots and backup, cloud service models and migration strategy.',
  'Cloud & Virtualization', 'Intermediate', 80, false,
  'From the datacenter to the cloud: the concepts behind the VMware, Veeam, AWS, Azure and Google Cloud work Questivity delivers.');

select pg_temp.module('virtualization-cloud-essentials', 1, 'Virtualization');
select pg_temp.module('virtualization-cloud-essentials', 2, 'Cloud');
select pg_temp.module('virtualization-cloud-essentials', 3, 'Assessment');

select pg_temp.lesson('virtualization-cloud-essentials', 1, 1, 'Hypervisors and vSphere concepts', 'article', 20, $md$
## Hypervisors
- **Type 1 (bare-metal):** runs directly on hardware — VMware ESXi, Microsoft Hyper-V, KVM, Nutanix AHV. Used in datacenters.
- **Type 2 (hosted):** runs on a desktop OS — used for labs and testing.

## vSphere building blocks
| Component | Role |
|---|---|
| ESXi host | Runs the virtual machines |
| vCenter Server | Central management of hosts and clusters |
| Cluster | Group of hosts sharing resources |
| **HA** | Restarts VMs on surviving hosts after a host failure |
| **DRS** | Balances VM load across hosts |
| **vMotion** | Live-migrates running VMs between hosts |
| Datastore | Storage (VMFS, NFS, vSAN) holding VM files |

## Sizing rules of thumb
- Plan for **N+1** host capacity so HA can restart everything after one host failure.
- Avoid oversizing VMs with vCPUs they don't use — it can *reduce* performance due to scheduling.
$md$);

select pg_temp.lesson('virtualization-cloud-essentials', 1, 2, 'Snapshots are not backups', 'article', 15, $md$
## What a snapshot is
A snapshot freezes the VM disk and writes subsequent changes to a **delta file**. It depends on the original disk — if the base disk or datastore is lost, so is the snapshot.

## Best practice
- Use snapshots for short-term rollback around a change (upgrade, patch) — **delete within 72 hours**.
- Never run production on snapshot chains; deltas grow and slow the VM.
- Check datastore free space before creating a snapshot.
- Consolidate if vCenter warns that consolidation is needed.

## Real backups
Use a backup platform (e.g. Veeam) following the **3-2-1 rule**: 3 copies of data, on 2 different media, 1 off-site — ideally with one **immutable** or air-gapped copy to survive ransomware. Test restores regularly; an untested backup is a hope, not a plan.
$md$);

select pg_temp.lesson('virtualization-cloud-essentials', 2, 1, 'Cloud models and migration strategy', 'article', 25, $md$
## Service models
| Model | Customer manages | Examples |
|---|---|---|
| IaaS | OS, middleware, apps, data | AWS EC2, Azure VMs, Google Compute Engine |
| PaaS | Apps and data | Managed databases, app services |
| SaaS | Data and access only | Microsoft 365, Salesforce |

## Deployment models
**Public**, **private**, **hybrid** (on-prem + public) and **multi-cloud**. Most Questivity customers are hybrid.

## Shared responsibility
The provider secures the cloud *infrastructure*; the customer secures what they put *in* it — identities, configurations, data, network rules. Most cloud breaches are customer misconfigurations.

## Migration strategies ("the Rs")
- **Rehost** (lift and shift), **Replatform** (small optimisations), **Refactor** (re-architect), **Repurchase** (move to SaaS), **Retire**, **Retain**.

## Minimising migration risk
1. Discover and map application dependencies first.
2. Migrate in waves, starting with low-risk workloads.
3. Plan cutover windows and rollback; validate with application owners.
4. Optimise cost after migration (right-size, reserved capacity, shut down idle resources).
$md$);

select pg_temp.lesson('virtualization-cloud-essentials', 3, 1, 'Virtualization & cloud assessment', 'quiz', 6, 'Pass mark applies. Retakes are unlimited.');
select pg_temp.q('virtualization-cloud-essentials', 'Virtualization & cloud assessment', 1, 'Which vSphere feature restarts VMs on other hosts after a host fails?',
  '["DRS", "HA", "vMotion", "Snapshots"]', 1,
  'vSphere HA restarts VMs on surviving hosts. DRS balances load; vMotion live-migrates.');
select pg_temp.q('virtualization-cloud-essentials', 'Virtualization & cloud assessment', 2, 'Why is a snapshot not a backup?',
  '["It is too large", "It depends on the base disk — lose the disk, lose the snapshot", "It cannot be deleted", "It is encrypted"]', 1,
  'Snapshots are delta files dependent on the original disk.');
select pg_temp.q('virtualization-cloud-essentials', 'Virtualization & cloud assessment', 3, 'What is the 3-2-1 backup rule?',
  '["3 servers, 2 sites, 1 admin", "3 copies, 2 media types, 1 off-site", "3 days, 2 weeks, 1 month", "3 backups per day"]', 1,
  '3 copies, 2 different media, 1 off-site — ideally one immutable.');
select pg_temp.q('virtualization-cloud-essentials', 'Virtualization & cloud assessment', 4, 'Under shared responsibility in IaaS, who secures the VM''s operating system configuration?',
  '["The cloud provider", "The customer", "Nobody", "The hardware vendor"]', 1,
  'In IaaS the customer manages the OS and everything above it.');
select pg_temp.q('virtualization-cloud-essentials', 'Virtualization & cloud assessment', 5, 'Moving a VM to the cloud as-is is called…',
  '["Refactor", "Retire", "Rehost (lift and shift)", "Repurchase"]', 2,
  'Rehost moves workloads with minimal change.');

-- ════════════════════════════════════════════════════════════════════
-- COURSE 7 — Linux System Administration Fundamentals
-- ════════════════════════════════════════════════════════════════════
select pg_temp.course('linux-admin-fundamentals', 'Linux System Administration Fundamentals',
  'The everyday Linux skills infrastructure engineers need: files and permissions, services, networking and logs.',
  'Systems', 'Beginner', 70, false,
  'Linux runs appliances, hypervisors, monitoring tools and cloud workloads across our customers. This course gets you productive at the command line.');

select pg_temp.module('linux-admin-fundamentals', 1, 'Core skills');
select pg_temp.module('linux-admin-fundamentals', 2, 'Operations');
select pg_temp.module('linux-admin-fundamentals', 3, 'Assessment');

select pg_temp.lesson('linux-admin-fundamentals', 1, 1, 'Files, users and permissions', 'article', 20, $md$
## Key directories
`/etc` configuration · `/var/log` logs · `/home` user data · `/opt` add-on software · `/tmp` temporary files

## Permissions
`-rwxr-x---` = owner read/write/execute, group read/execute, others nothing. Numeric: r=4, w=2, x=1 → `750`.

```bash
ls -l /etc/ssh/sshd_config
chmod 640 app.conf          # owner rw, group r
chown appuser:appgroup app.conf
sudo -l                     # what can I run with sudo?
```

## Rules
- Log in as yourself and use `sudo` — never share the root password.
- Use SSH keys, and disable password authentication for SSH on servers where possible.
- Never `chmod 777` to "fix" a problem; find the right owner and group instead.
$md$);

select pg_temp.lesson('linux-admin-fundamentals', 2, 1, 'Services, networking and logs', 'article', 25, $md$
## Services (systemd)
```bash
systemctl status nginx
sudo systemctl restart nginx
sudo systemctl enable --now chronyd
journalctl -u nginx --since "1 hour ago"
```

## Networking
```bash
ip a                      # interfaces and addresses
ip r                      # routing table
ss -tulpn                 # listening ports and owning processes
ping -c 4 10.0.0.1
traceroute 8.8.8.8        # or tracepath
dig example.com           # DNS lookup
curl -vk https://host:443 # test TLS/HTTP
```

## Disk and performance
```bash
df -h          # disk usage by filesystem
du -sh /var/*  # what is using space
free -h        # memory
top / htop     # processes
```

## Logs
`/var/log/messages` or `/var/log/syslog`, `/var/log/secure` or `/var/log/auth.log`, plus `journalctl`. When troubleshooting, always check the time the problem started and read logs around it.
$md$);

select pg_temp.lesson('linux-admin-fundamentals', 3, 1, 'Linux assessment', 'quiz', 5, 'Pass mark applies. Retakes are unlimited.');
select pg_temp.q('linux-admin-fundamentals', 'Linux assessment', 1, 'What numeric mode gives owner read/write, group read, others nothing?',
  '["777", "640", "755", "600"]', 1, 'rw- = 6, r-- = 4, --- = 0 → 640.');
select pg_temp.q('linux-admin-fundamentals', 'Linux assessment', 2, 'Which command shows listening ports and the processes that own them?',
  '["df -h", "ss -tulpn", "chmod", "free -h"]', 1, '`ss -tulpn` lists TCP/UDP listeners with process names.');
select pg_temp.q('linux-admin-fundamentals', 'Linux assessment', 3, 'How do you view the last hour of logs for the nginx service?',
  '["journalctl -u nginx --since \"1 hour ago\"", "cat nginx", "systemctl logs", "top nginx"]', 0,
  '`journalctl -u <unit> --since` filters the systemd journal.');
select pg_temp.q('linux-admin-fundamentals', 'Linux assessment', 4, 'An application cannot read its config file. What is the right fix?',
  '["chmod 777 the file", "Set the correct owner/group and minimal permissions", "Run the app as root", "Delete the file"]', 1,
  'Fix ownership and permissions properly; never 777.');

-- ════════════════════════════════════════════════════════════════════
-- LEARNING PATHS
-- ════════════════════════════════════════════════════════════════════
insert into public.learning_paths (slug, title, description, audience, is_onboarding, default_due_days, status) values
  ('new-joinee-onboarding', 'New Joinee Onboarding',
   'Everything every new Questivity employee completes in their first 30 days. Assigned automatically when you join.',
   'All new employees', true, 30, 'published'),
  ('network-engineer-track', 'Network Engineer Track',
   'Switching, routing, firewalls and Linux skills for campus and datacenter network engineers.',
   'Network & security engineers', false, 90, 'published'),
  ('cloud-virtualization-track', 'Cloud & Virtualization Track',
   'Virtualization, backup, cloud migration and the Linux and security skills that go with them.',
   'Systems & cloud engineers', false, 90, 'published')
on conflict (slug) do nothing;

insert into public.learning_path_courses (path_id, course_id, position)
select p.id, c.id, x.pos
from (values
  ('new-joinee-onboarding', 'welcome-to-questivity', 1),
  ('new-joinee-onboarding', 'information-security-essentials', 2),
  ('new-joinee-onboarding', 'customer-delivery-fundamentals', 3),
  ('network-engineer-track', 'enterprise-networking-foundations', 1),
  ('network-engineer-track', 'network-security-firewalls', 2),
  ('network-engineer-track', 'linux-admin-fundamentals', 3),
  ('cloud-virtualization-track', 'virtualization-cloud-essentials', 1),
  ('cloud-virtualization-track', 'linux-admin-fundamentals', 2),
  ('cloud-virtualization-track', 'network-security-firewalls', 3)
) as x(path_slug, course_slug, pos)
join public.learning_paths p on p.slug = x.path_slug
join public.courses c on c.slug = x.course_slug
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════════
-- KNOWLEDGE BASE
-- ════════════════════════════════════════════════════════════════════
insert into public.kb_categories (slug, name, description, position) values
  ('company', 'Company & Policies', 'About Questivity, how we work, HR and policies', 1),
  ('it-access', 'IT, Access & Security', 'Accounts, devices, security and acceptable use', 2),
  ('delivery', 'Delivery & Process', 'Change, incidents, documentation and customer process', 3),
  ('runbooks', 'Technical Runbooks', 'Step-by-step technical procedures and checklists', 4),
  ('partners', 'Partners & Solutions', 'Partner portfolio and solution positioning', 5)
on conflict (slug) do nothing;

create or replace function pg_temp.kb(p_slug text, p_cat text, p_title text, p_summary text,
  p_tags text[], p_status public.content_status, p_owner text, p_body text)
returns void language sql as $$
  insert into public.kb_articles (slug, category_id, title, summary, tags, status, owner_team, review_due, body_md)
  select p_slug, c.id, p_title, p_summary, p_tags, p_status, p_owner, current_date + 180, p_body
  from public.kb_categories c where c.slug = p_cat
  on conflict (slug) do nothing;
$$;

select pg_temp.kb('about-questivity', 'company', 'About Questivity',
  'Company overview: what we do, who we serve, where we are.', '{company,overview,onboarding}', 'published', 'HR & Operations', $md$
## Overview
Questivity provides IT infrastructure solutions and services to medium and large enterprise customers. We partner with technology leaders including Cisco, Dell, HPE, Juniper, VMware, Palo Alto Networks, Fortinet, Zscaler, Microsoft, AWS and Google Cloud to bring best-of-breed solutions to our clients.

## What we offer
- **IT Products** — networking, security, servers, storage, virtualization and power products at competitive prices.
- **IT Solutions** — datacenter (design, power, cooling, cabling, servers, virtualization, network, storage), unified access (routing, switching, wireless, mobility, BYOD, security), unified communications and collaboration, cloud migration, SAP and SAP HANA infrastructure, service management.
- **IT Services** — solution deployment (design, configure, install, deploy), staff augmentation and managed services.
- **Training** — network, Linux system administration and Oracle database training delivered by certified faculty, backed by our datacenter lab.

## Track record
Questivity has completed more than 100 projects for clients and is known for designing cost-effective solutions that deliver significant savings.

## Contact
Headquarters: 1680 Civic Center Dr, Suite 209, Santa Clara, CA 95050 · Phone 1.408.615.1781 · info@questivity.com · www.questivity.com

## Public sector
The Questivity website has a dedicated SEWP VI contract page. Ask the sales team before discussing public-sector procurement with a customer.
$md$);

select pg_temp.kb('engagement-model', 'company', 'Questivity engagement models',
  'Solution deployment, staff augmentation and managed services — when to use each.', '{engagement,services,sales,delivery}', 'published', 'Presales & Solutions', $md$
## Solution deployment
A defined project from design through configuration, installation and deployment, ending in handover with as-built documentation. Questivity owns the outcome.

## Staff augmentation
Questivity engineers join the customer's team for a defined period. The customer directs daily work; Questivity is responsible for the quality, conduct and replacement of its people.

## Managed services
Questivity takes over ongoing management of some or all of the customer's infrastructure — monitoring, incident handling, patching, changes and reporting — under contractual service levels.

## How to choose
- Clear scope and end date → solution deployment.
- Customer has a team but lacks capacity or a niche skill → staff augmentation.
- Customer wants to stop running infrastructure day-to-day → managed services.

Customers commonly progress from a deployment project to managed services.
$md$);

select pg_temp.kb('partner-portfolio', 'partners', 'Partner portfolio at a glance',
  'Which partner covers which technology area.', '{partners,vendors,cisco,dell,fortinet,palo alto,zscaler,vmware,aws,azure}', 'published', 'Presales & Solutions', $md$
## Networking & wireless
Cisco, Cisco Meraki (cloud-managed), Juniper Networks, Arista (datacenter switching), Aruba/HPE, Ruckus.

## Security
Palo Alto Networks (NGFW, Prisma SASE), Fortinet (FortiGate, Security Fabric), Zscaler (cloud SSE: ZIA/ZPA), Aurascape (visibility and security for employee AI use and enterprise AI agents).

## Compute & storage
Dell, HPE, Lenovo, ASUS.

## Virtualization & data protection
VMware (vSphere), Veeam (backup and recovery).

## Cloud & productivity
AWS, Microsoft Azure, Google Cloud, Microsoft.

## Datacenter power
Eaton and APC by Schneider Electric (UPS, PDUs, power management).

## Guidance
Recommend the product that fits the customer's requirements, existing estate and budget. Check with presales for current partner programs, deal registration and pricing before quoting.
$md$);

select pg_temp.kb('change-management-process', 'delivery', 'Change management process',
  'Standard, normal and emergency changes and what every change record needs.', '{change,itil,process,rollback,cab}', 'published', 'Project Management', $md$
## Change types
- **Standard:** pre-approved, low risk, repeatable, follows a documented template.
- **Normal:** assessed and approved before the planned window.
- **Emergency:** required to restore service or close an active security risk; expedited approval and documented retrospectively.

## Every change record must contain
1. Description, reason and affected systems/customers.
2. Implementation steps.
3. Rollback plan and rollback trigger.
4. Test/validation plan.
5. Planned window, customer approver and communications.

## Rules
- In customer environments, the **customer's change process takes precedence**.
- No change without a rollback plan.
- Update the record with the outcome and any deviation from plan.
- Failed or rolled-back changes get a short review so the lesson reaches the knowledge base.
$md$);

select pg_temp.kb('incident-priorities', 'delivery', 'Incident priority levels (P1–P4)',
  'How to prioritise incidents by impact and urgency.', '{incident,priority,sla,service desk,p1}', 'published', 'Service Desk', $md$
## Priority matrix
Priority is decided by **impact** (how many users/services) and **urgency** (how quickly it hurts the business).

| Priority | Description |
|---|---|
| P1 – Critical | Business-critical service or core infrastructure down for many users; no workaround |
| P2 – High | Major degradation, or critical service down for a site/team |
| P3 – Medium | Limited impact; workaround available |
| P4 – Low | Minor issue, cosmetic fault or question |

## Important
Response and resolution targets are **defined per customer contract**. Always check the customer's SLA. If in doubt between two priorities, choose the higher one and let the service desk lead re-assess.

## P1 handling
Notify the on-call lead immediately, open a bridge, update the customer at the agreed interval, and record a timeline for the post-incident review.
$md$);

select pg_temp.kb('reporting-security-incident', 'it-access', 'Reporting a security incident',
  'What counts as a security incident and what to do immediately.', '{security,incident,phishing,lost device,mfa}', 'published', 'Security', $md$
## Report immediately if
- You clicked a suspicious link or opened a suspicious attachment.
- You approved an MFA prompt you did not start, or are receiving unexpected prompts.
- A laptop, phone or token is lost or stolen.
- Data was sent to the wrong person.
- You notice unusual activity in a Questivity or customer system.

## What to do
1. **Stop** — disconnect the affected device from the network if malware is suspected, but do not power it off.
2. **Report** to your manager and the IT security contact listed in the employee handbook. Speed matters more than certainty.
3. **Preserve evidence** — do not delete emails or files.
4. If a customer environment is involved, follow that customer's incident process as well.

Good-faith reports are never penalised.
$md$);

select pg_temp.kb('ai-tools-acceptable-use', 'it-access', 'Using AI tools at work',
  'Rules for using AI assistants safely with company and customer data.', '{ai,chatgpt,claude,acceptable use,data}', 'published', 'Security', $md$
## The rules
1. Use only **company-approved** AI tools for work.
2. Never enter **Restricted** data (passwords, keys, personal data) into any AI tool.
3. Never enter **Confidential** customer data (configs, diagrams, contracts, pricing) unless the tool is approved for that data class.
4. Review and test every AI-generated configuration, script or command before use. You are accountable for it.
5. Do not present AI-generated content to customers as verified fact without checking it.

## Quest Assistant
The Quest Assistant inside Questivity LMS answers only from our published knowledge base and shows its sources. If it cannot find an answer it says so and flags the gap to the knowledge-base team.
$md$);

select pg_temp.kb('cisco-switch-baseline-hardening', 'runbooks', 'Cisco switch baseline hardening',
  'Baseline configuration template and checklist for managed Cisco IOS/IOS-XE switches.', '{cisco,switch,hardening,security,baseline,ios}', 'published', 'Network Engineering', $md$
## Checklist
- [ ] SSH v2 only; Telnet and HTTP server disabled
- [ ] Management ACL on VTY lines
- [ ] AAA with TACACS+/RADIUS and local fallback
- [ ] NTP, timestamps, syslog to central collector
- [ ] SNMPv3 only
- [ ] Unused ports shut down in parking VLAN
- [ ] PortFast + BPDU Guard on access ports
- [ ] Native VLAN changed; trunks pruned
- [ ] Login banner
- [ ] Config backed up after change

## Template (adapt names and addresses)
```text
hostname <SITE>-<ROLE>-<NN>
service timestamps log datetime msec localtime
service password-encryption
no ip http server
no ip http secure-server
ip domain-name <customer.domain>
crypto key generate rsa modulus 2048
ip ssh version 2
!
aaa new-model
aaa authentication login default group tacacs+ local
aaa authorization exec default group tacacs+ local
!
ip access-list standard MGMT-ONLY
 permit <mgmt-subnet> <wildcard>
 deny any log
line vty 0 15
 access-class MGMT-ONLY in
 transport input ssh
 exec-timeout 10 0
!
ntp server <ntp-ip>
logging host <syslog-ip>
snmp-server group NMS v3 priv
!
vlan 999
 name PARKING
interface range <unused-ports>
 switchport access vlan 999
 shutdown
!
spanning-tree mode rapid-pvst
spanning-tree portfast bpduguard default
!
banner login ^Authorised access only. Activity is logged.^
```

## Verify
`show ip ssh`, `show run | i http`, `show ntp status`, `show logging`, `show spanning-tree summary`, `show interfaces status | i disabled`.
$md$);

select pg_temp.kb('vmware-snapshot-best-practices', 'runbooks', 'VMware snapshot best practices',
  'When to use snapshots, how long to keep them and how to clean up safely.', '{vmware,vsphere,snapshot,backup,veeam}', 'published', 'Cloud & Virtualization', $md$
## Rules
- Snapshots are for **short-term rollback** around a change, not backups.
- Delete within **72 hours**. Never leave production VMs on snapshot chains.
- Check datastore free space first — deltas can fill a datastore and stop every VM on it.
- Do not snapshot VMs with RDMs in physical mode or independent disks expecting them to be captured.

## Before a change
1. Confirm a recent successful backup exists.
2. Take the snapshot (memory optional — slower, larger).
3. Record the snapshot name and change ticket in the description.

## After the change
1. Validate with the application owner.
2. Delete the snapshot (this commits changes).
3. If vCenter shows "Virtual machine disks consolidation is needed", run **Snapshots → Consolidate** in a quiet period.

## Backups
Use Veeam or the customer's backup platform with the 3-2-1 rule and at least one immutable copy. Test restores quarterly.
$md$);

select pg_temp.kb('linux-troubleshooting-cheatsheet', 'runbooks', 'Linux troubleshooting cheat sheet',
  'Fast commands for diagnosing services, network, disk and performance on Linux.', '{linux,troubleshooting,commands,systemd,network}', 'published', 'Network Engineering', $md$
## Service down
```bash
systemctl status <svc>
journalctl -u <svc> -n 100 --no-pager
sudo systemctl restart <svc>
```

## Network
```bash
ip a; ip r
ss -tulpn
ping -c 4 <gw>
tracepath <dest>
dig <name> +short
curl -vk https://<host>:<port>
```

## Disk full
```bash
df -h
sudo du -xh / --max-depth=1 | sort -h | tail
sudo journalctl --vacuum-size=500M
```
Files deleted but still held open: `sudo lsof +L1` — restart the owning process to free the space.

## Performance
```bash
uptime            # load average
top -o %CPU
free -h
vmstat 1 5
iostat -xz 1 5    # needs sysstat
```
$md$);

select pg_temp.kb('firewall-rule-request', 'delivery', 'Firewall rule request process',
  'Information required to request, approve and implement a firewall rule.', '{firewall,rule,change,palo alto,fortinet,security policy}', 'published', 'Security', $md$
## Information required
- Source zone and address(es)
- Destination zone and address(es)
- Application or service/port
- Business justification
- Requester and **rule owner**
- Expiry date for temporary access
- Customer change reference

## Process
1. Requester raises the request in the customer's ticketing system (or ours for internal systems).
2. Security engineer reviews against policy: least privilege, no any/any, no internet-exposed management.
3. Change approved through the change process.
4. Rule implemented with owner, ticket and review date in the description; logging enabled.
5. Requester validates; ticket closed with evidence.

## Housekeeping
Review rule hit counts quarterly; disable then remove unused and expired rules.
$md$);

-- DRAFT templates — HR / IT must complete and publish (the assistant ignores drafts)
select pg_temp.kb('leave-and-holidays', 'company', 'Leave and holiday policy (TEMPLATE)',
  'Annual leave, sick leave and public holidays.', '{hr,leave,holiday,vacation,sick}', 'draft', 'HR & Operations', $md$
> **TEMPLATE — replace every [placeholder] and publish.**

## Annual leave
Full-time employees receive [N] days of paid annual leave per year, accrued [monthly/yearly]. Request leave in [system] at least [N] working days in advance.

## Sick leave
[N] days per year. Notify your manager before [time] on the first day.

## Public holidays
See the holiday calendar for your location: [link].
$md$);

select pg_temp.kb('new-joinee-it-setup', 'it-access', 'New joinee IT setup (TEMPLATE)',
  'Getting your laptop, accounts, MFA, email and VPN working on day one.', '{onboarding,laptop,email,vpn,mfa,accounts}', 'draft', 'Service Desk', $md$
> **TEMPLATE — replace every [placeholder] and publish.**

## Day one
1. Collect your laptop from [person/location].
2. Sign in with the temporary password from [source]; you will be asked to set a new one.
3. Enrol MFA using [authenticator app].
4. Install the VPN client [name] from [location]; connect using your company account.

## Tools you will need
Email/calendar: [tool] · Chat: [tool] · Ticketing: [tool] · Password manager: [tool] · Documentation: [tool]

## Help
Raise a ticket at [portal] or contact [contact].
$md$);
