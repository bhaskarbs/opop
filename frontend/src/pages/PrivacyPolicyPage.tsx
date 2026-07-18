import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const EFFECTIVE_DATE = 'July 18, 2026'

interface Section {
  heading: string
  body: ReactNode
}

const SECTIONS: Section[] = [
  {
    heading: '1. Introduction',
    body: (
      <p>
        OpenOpportunity ("OpenOpportunity", "we", "us", or "our") operates a job and startup
        partnership platform connecting candidates, companies, and community programs (the
        "Platform"). This Privacy Policy explains what personal information we collect, how we use
        and share it, and the choices you have. By creating an account or otherwise using the
        Platform, you agree to the collection and use of information as described here.
      </p>
    ),
  },
  {
    heading: '2. Information We Collect',
    body: (
      <>
        <p>We collect information in the following ways:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information.</strong> Name, email address, mobile number, password
            (stored as a salted hash, never in plain text), and account type (candidate, company, or
            admin) when you register or sign in — including via "Sign in with Google", which shares
            your Google account name and email with us.
          </li>
          <li>
            <strong>Candidate profile data.</strong> Resume file and its contents, skills, work-mode
            and job-type preferences, life goals, location, and any other detail you add to your
            candidate profile.
          </li>
          <li>
            <strong>Company profile and verification data.</strong> Company name, entity type, CIN,
            GSTIN, PAN, registered address, authorized signatory name, and verification documents
            submitted for admin review before a company may post jobs.
          </li>
          <li>
            <strong>Job and application activity.</strong> Jobs you post or apply to, application
            status, and messages exchanged through the Platform in connection with an application.
          </li>
          <li>
            <strong>Idea and partnership submissions.</strong> Startup ideas you submit for review,
            and — if you express interest in someone else's idea as an investor or participant — the
            name, contact details, ticket size, and message you provide are shared with that idea's
            submitter.
          </li>
          <li>
            <strong>Community and support requests.</strong> If you ask to "know more" about
            community income or request the income-types guide, the name, email, phone number, and
            (where applicable) company name you enter are sent to our community team so we can
            follow up with you.
          </li>
          <li>
            <strong>Usage data.</strong> Pages visited, search queries, device/browser information,
            and similar technical data collected automatically as you use the Platform.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: '3. How We Use Your Information',
    body: (
      <>
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and maintain your account, and authenticate you when you sign in.</li>
          <li>
            Operate core Platform features: job search and applications, candidate search for
            companies, the ideas/partnerships marketplace, mock interviews, and community programs.
          </li>
          <li>
            Verify company accounts before they can post jobs, and moderate submitted jobs and ideas
            before they appear publicly.
          </li>
          <li>
            Send transactional emails — e.g. application updates, or a reply to a request you
            submitted.
          </li>
          <li>Maintain the security and integrity of the Platform, including detecting abuse.</li>
          <li>Improve the Platform and understand how it's used.</li>
          <li>Comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </>
    ),
  },
  {
    heading: '4. How We Share Your Information',
    body: (
      <>
        <p>We do not sell your personal information. We share it only as follows:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Candidates and companies, with each other.</strong> When you apply to a job, the
            company sees your profile and application. When you post a job, applicants see your
            company profile. Ideas you submit are visible to the public once approved; expressing
            interest in an idea shares your contact details with that idea's submitter.
          </li>
          <li>
            <strong>Service providers.</strong> Vendors who host our infrastructure, send email on
            our behalf, or otherwise process data to help us operate the Platform, bound by
            confidentiality obligations.
          </li>
          <li>
            <strong>Administrators.</strong> Platform admins can access account and content data as
            needed to moderate jobs, ideas, and companies, and to manage user accounts.
          </li>
          <li>
            <strong>Legal and safety.</strong> Where required by law, legal process, or to protect
            the rights, property, or safety of OpenOpportunity, our users, or the public.
          </li>
          <li>
            <strong>Business transfers.</strong> In connection with a merger, acquisition, or sale
            of assets, subject to this Policy continuing to govern your information.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: '5. Cookies and Similar Technologies',
    body: (
      <p>
        We use cookies and similar technologies to keep you signed in (including a secure, httpOnly
        cookie used to refresh your session), remember your language preference, and understand how
        the Platform is used. You can control cookies through your browser settings; disabling
        essential cookies may prevent you from staying signed in.
      </p>
    ),
  },
  {
    heading: '6. Data Retention',
    body: (
      <p>
        We retain your information for as long as your account is active and as needed to provide
        the Platform. If you delete your account or specific content (such as a resume or an idea),
        we remove it from active use within a reasonable period, except where we must retain it to
        comply with legal obligations, resolve disputes, or enforce our agreements.
      </p>
    ),
  },
  {
    heading: '7. Your Rights and Choices',
    body: (
      <>
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Access, correct, or update the personal information we hold about you.</li>
          <li>Request deletion of your account and associated personal information.</li>
          <li>Withdraw a job, application, or idea you submitted.</li>
          <li>Object to or restrict certain processing of your information.</li>
        </ul>
        <p className="mt-3">
          You can exercise most of these directly from your profile settings, or by contacting us
          using the details in Section 12.
        </p>
      </>
    ),
  },
  {
    heading: '8. Data Security',
    body: (
      <p>
        We use industry-standard safeguards — including password hashing, encrypted connections, and
        access controls — to protect your information. No method of transmission or storage is
        completely secure, and we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    heading: '9. Children’s Privacy',
    body: (
      <p>
        The Platform is intended for users who are at least 18 years old, or the age of majority in
        their jurisdiction. We do not knowingly collect personal information from children. If you
        believe a child has provided us with personal information, please contact us so we can
        remove it.
      </p>
    ),
  },
  {
    heading: '10. International Users',
    body: (
      <p>
        OpenOpportunity is operated from India, and information you provide may be processed and
        stored in India or in other countries where our service providers operate. By using the
        Platform, you consent to this transfer and processing.
      </p>
    ),
  },
  {
    heading: '11. Changes to This Policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time. If we make material changes, we will
        update the effective date below and, where appropriate, notify you. Continued use of the
        Platform after a change becomes effective means you accept the revised Policy.
      </p>
    ),
  },
  {
    heading: '12. Contact Us',
    body: (
      <p>
        Questions about this Privacy Policy or your personal information can be sent to{' '}
        <a href="mailto:privacy@openopportunity.com" className="font-semibold text-primary">
          privacy@openopportunity.com
        </a>
        .
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('layout')

  return (
    <main className="mx-auto max-w-[840px] px-6 py-14">
      <h1 className="mb-2 text-[32px] font-extrabold tracking-[-0.01em] text-ink">
        {t('footer.legal.privacyPolicy')}
      </h1>
      <p className="mb-10 text-sm text-fog">Effective date: {EFFECTIVE_DATE}</p>
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2.5 text-[18px] font-bold text-ink">{section.heading}</h2>
            <div className="flex flex-col gap-3 text-[15px] leading-[1.7] text-slate">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
