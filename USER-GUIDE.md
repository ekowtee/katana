# Katana — User Guide

Katana is The Ninani Group's interview portal. It takes a cohort of applicants from CV to decision: CVs are summarised for the panel, interviews are scheduled with calendar invitations, panel members score every candidate against the same questions, and when the cohort is closed each candidate is emailed their outcome and can read the panel's feedback.

This guide is for the three kinds of user:

- **Administrators** set up cohorts and run the process.
- **Panel members** interview, score and write feedback.
- **Candidates** see their interview details, and later their outcome and feedback.

Web address: **https://katana.ninanigroup.com**

---

## Signing in

Nobody has a password. You sign in with a **link sent to your email**:

1. Open the portal and enter your email address.
2. Open the email from *Ninani Group HR* and click **Open Secure Portal**. The link works once and for 30 minutes; request another from the sign-in page whenever you need one.
3. Staff who are signed in to **TerraNova** arrive already signed in.

If you get no email, the address isn't on the system yet. Administrators add staff under **Admin → Access & Invites**; candidates are added automatically when their CV is uploaded.

---

## The flow at a glance

| Step | Who | Where |
|---|---|---|
| 1. Create the cohort: name, role, who's on the panel, scoring weights | Admin | Admin → Cohorts |
| 2. Upload CVs and generate the panel's CV summaries | Admin | Admin → Cohorts → CVs |
| 3. Set interview slots and send calendar invitations | Admin | Admin → Cohorts → Interviews |
| 4. Set the interview questions (hand-written or imported from RiteVizor) | Admin, panel | Admin → Cohorts → questions; candidate file |
| 5. Interview: read the CV summary, score each question, give a recommendation | Panel | Dashboard → candidate file |
| 6. Draft feedback for the candidate | Panel | Candidate file → Feedback to Candidate |
| 7. Set each candidate's decision and publish their feedback | Admin | Admin → Candidate Feedback |
| 8. Close the cohort: scores lock, every candidate is emailed their outcome | Admin | Admin → Cohorts → Close the cohort |
| 9. Read the outcome, feedback and CV summary | Candidate | Their own page |

---

## Administrators

### 1. Set up a cohort

**Admin → Cohorts → New cohort.**

- **Name** — e.g. *October 2026*.
- **Role being interviewed for** — e.g. *IT Support Officer*. It appears everywhere the cohort does, and the AI writes each CV summary against it.
- **Start from** — blank, or a copy of an earlier cohort (its weights and questions come across).

Then, in the cohort's cards:

- **Cohort, role & weights** — the points each dimension is worth: *Behavioural*, *Technical Competencies*, *Experience* and *Appearance & Presence* (default 15 / 15 / 10 / 10 = 50). Changing weights rescores everyone in the cohort.
- **Interview panel** — tick the panel members and administrators who will interview this cohort. **Only they** see the cohort on their dashboard, open its candidates and score them. Whoever creates a cohort is on its panel to begin with. New staff must first be added under **Access & Invites**.

### 2. Upload CVs and generate summaries

**Admin → Cohorts → CVs.**

1. Drop the PDF CVs into the box (several at once is fine; up to 4 MB each). Word files need converting to PDF first.
2. Click **Generate summaries**. Each CV is read by the AI provider set up under *Settings* and becomes a **candidate** in the cohort, with contact details filled in and a panel-only **CV summary** written for the role: experience, education, strengths, and *points to probe* at interview. A candidate with the same email as an existing one is updated rather than duplicated. Allow up to a minute per CV.
3. A failed file shows why (for example "doesn't look like a CV"). Fix it and click the re-run arrow on that file.

Candidates get a sign-in account from the email on their CV. Nothing is sent to them at this point.

### 3. Schedule interviews

**Admin → Cohorts → Interviews.**

- Set the cohort's **default venue or meeting link** once.
- For each candidate, set the **date** and **time** and the length (default 45 minutes), and a different venue if needed. Click **Save** on the row, or **Save all changes** to save every edited row at once. Each row says *Unsaved changes* until it's saved, and *Add a time* if only the date is filled in.
- **Send invitations for all scheduled** emails every panel member a calendar invitation (.ics). Accepting it puts the interview in Outlook, Google Calendar or Apple Calendar, with the candidate's name, the role, the venue and a link to the candidate's file in the portal. Tick **Also invite the candidates** to send each candidate their own invitation.
- Sending again after a change **updates** the existing calendar entry. The **✕** button cancels an interview: everyone who was invited gets a cancellation and the entry is removed from their calendar.
- The row shows when invitations were last sent and whether any failed.

Times are entered in your own time zone; invitations carry the exact moment, so recipients see it in theirs.

### 4. Set the interview questions

Below the Interviews card, one section per dimension. Panel members score every question from 1 to 5 on each candidate's file; a dimension's score is the average of its questions, so the number of questions doesn't change its weight.

- **Type** a question and click **Add**. Paste a list, one per line, to add several.
- **Import from RiteVizor** pulls a role's rubric from the group's appraisal platform. Choose the rubric (the behavioural rubric, or the craft rubric for the role's function), the **band** the role sits at, and which dimension to add the questions under (behavioural rubrics go under *Behavioural*, craft rubrics under *Technical Competencies*). Each rubric dimension becomes one question, and the band's anchor — what the role is expected to show — appears to the panel as **"What a strong answer shows"**. Importing again skips questions already there.
- The pencil edits a question and its guidance; the arrows reorder; the bin deletes (deleting a scored question deletes those scores and rescores the candidates).
- **Appearance & Presence** isn't asked of the candidate: the panel scores what they observe. One item is enough.

Panel members can also add questions from a candidate's file (see below). Questions added that way show who added them.

### 5. During and after interviews

Watch the **Dashboard** (one cohort at a time): who has been scored, the cohort's averages per dimension, the ranking, each panel member's recommendation tally under **Votes**, and the interview slots.

### 6. Decide, publish feedback, close

**Admin → Candidate Feedback.** Pick the cohort, then each candidate:

- **Decision Status** — *Selected*, *Reserve / Train*, *Not Selected*, *Not Assessed*. (*Under Review* and *Discuss* are interim and block closing.)
- **Feedback** — the panel's drafts are here. Edit them, then tick **Approve & publish** on each section the candidate should see. Panel notes and scores are never shown to candidates.

**Admin → Cohorts → Close the cohort.** The card lists anyone still undecided. When everyone has a decision:

- **Close & email outcomes** locks every score and emails each candidate their outcome with a sign-in link. The wording depends on the decision. Each email is logged at the bottom of the card; **Email the … not yet sent** retries any that failed.
- Untick *Email every candidate* to close silently: candidates then see their outcome only if they sign in.
- **Reopen** unlocks scoring and hides outcomes again. It does not recall emails already sent.

### Settings (Admin → Settings)

- **Email (SMTP)** — needed for sign-in links, invitations and outcome emails. For Gmail use an app password. **Send test email to me** checks it.
- **AI for CV summaries** — choose a provider (Anthropic, OpenAI, Google Gemini, xAI Grok or Moonshot Kimi), paste its API key, **Test key** to load the available models, pick one, **Save & use this provider**. Anthropic and Gemini read the PDF itself; the others read its text, so scanned image-only CVs need Anthropic or Gemini.
- **RiteVizor rubrics** — the RiteVizor API address and the key that matches `KATANA_API_KEY` on RiteVizor. **Test connection** lists the rubrics available.

Keys and passwords are stored encrypted and never shown again; only the last four characters appear.

### Access & Invites

Add administrators and panel members by email and name. The link icon copies a sign-in link; the send icon emails one. Each email address holds one account with one role: an administrator can do everything a panel member can, so don't add the same person twice.

---

## Panel members

### Before the interview

Accept the **calendar invitation** emailed to you: it holds the time, venue and a link to the candidate's file.

Open the **Dashboard**. You see only the cohorts whose panel you're on; switch between them at the top right. Click a candidate to open their file:

- **CV Summary** — the panel's read of their CV: experience, education, strengths and **points to probe**. Candidates never see the points to probe. **View CV** opens the original PDF.
- **Your Assessment** — the questions you'll score, by dimension. Under a question, **What a strong answer shows** gives the scoring guidance (for imported RiteVizor questions, the band anchor for the role).

### Adding a question

If something is missing, click **+ Add a … question** under the dimension on any candidate's file. It's added for the whole cohort. You can change or delete a question you added until someone scores it; administrators can change any question.

### Scoring

On the candidate's file, score every question from **1 (weak) to 5 (excellent)** — click a score again to clear it — then choose your **recommendation** (*Strongly Recommend*, *Recommend*, *Reserve List*, *Do Not Recommend*), add any notes for the panel, and click **Save assessment**. You can come back and change it until the cohort is closed.

Only you see your own scores. The candidate's total, the Score Breakdown and the Dashboard show the panel's **average**; recommendations are tallied as the **Votes** column on the Dashboard. Your notes stay internal.

### Feedback for the candidate

Under **Feedback to Candidate**, write what the candidate should hear: an overall note and, if useful, a note per dimension. It's a draft; an administrator reviews, edits and publishes it. Once a section is published, only an administrator can change it. The candidate sees published sections after the cohort is closed.

### Results

The Dashboard shows the cohort's state at the top: **Interviewing** or **Closed · results released**. Once closed, scores are final and the assessment card becomes read-only.

---

## Candidates

You'll receive emails from **Ninani Group HR**:

- **Your interview** — a calendar invitation with the time and venue. Accept it so it's in your diary; if you can't make it, reply to the email as soon as possible.
- **Your interview outcome** — once the panel has decided. The button signs you in to your page.

Your page shows:

- **Before the decision** — your interview time and venue.
- **After the decision** — your outcome; the panel's note to you and feedback by area, with your scores per area; and **how the panel read your CV**, the summary the panel used, so you can see what came across.

You can request a new sign-in link from the portal's sign-in page at any time.

---

## Who can see what

| | Candidate | Panel member | Administrator |
|---|---|---|---|
| Cohorts on the dashboard | — | those they're on the panel for | those they're on the panel for |
| Candidate files, CV summary, CV | — | their cohorts | any (read-only scoring unless on the panel) |
| Score, recommend, add questions | — | their cohorts, until closed | where on the panel, until closed |
| Draft feedback | — | their cohorts | any |
| Publish feedback, set decisions, close cohorts | — | — | ✓ |
| Panel notes and individual scores | never | own notes; panel averages | all |
| Own outcome, published feedback, CV summary (minus points to probe) | after the cohort is closed | — | — |
