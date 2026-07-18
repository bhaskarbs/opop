import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const EFFECTIVE_DATE = 'July 18, 2026'

interface Section {
  heading: string
  body: ReactNode
}

const SECTIONS: Section[] = [
  {
    heading: '1. Acceptance of Terms',
    body: (
      <p>
        These Terms of Service ("Terms") govern your access to and use of OpenOpportunity's website,
        applications, and related services (the "Platform"), operated by OpenOpportunity ("we",
        "us", or "our"). By creating an account or otherwise using the Platform, you agree to be
        bound by these Terms and by our Privacy Policy. If you do not agree, do not use the
        Platform.
      </p>
    ),
  },
  {
    heading: '2. Eligibility and Account Types',
    body: (
      <>
        <p>
          You must be at least 18 years old, and able to form a binding contract, to create an
          account. The Platform supports three account types:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Candidate</strong> accounts, for individuals searching for jobs, partnerships,
            or community opportunities.
          </li>
          <li>
            <strong>Company</strong> accounts, for organizations posting jobs, searching candidates,
            or offering startup partnerships. Company accounts must complete verification (including
            entity type, CIN/GSTIN/PAN, and supporting documents) before they may post a job; we may
            reject or revoke verification at our discretion.
          </li>
          <li>
            <strong>Admin</strong> accounts, provisioned by us to moderate content and manage the
            Platform.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: '3. Your Account',
    body: (
      <p>
        You are responsible for maintaining the confidentiality of your password and for all
        activity under your account. Notify us immediately of any unauthorized use. We may suspend
        or terminate accounts that provide false information, violate these Terms, or are inactive
        or abusive.
      </p>
    ),
  },
  {
    heading: '4. Candidate Use of the Platform',
    body: (
      <p>
        Candidates may search and apply for jobs, maintain a profile and resume, submit ideas,
        express interest in other users' ideas as an investor or participant, use mock interview
        tools, and access community programs. You are responsible for the accuracy of the
        information in your profile, resume, and applications. Applying to a job does not guarantee
        an interview, offer, or any outcome — hiring decisions are made solely by the posting
        company.
      </p>
    ),
  },
  {
    heading: '5. Company Use of the Platform',
    body: (
      <>
        <p>
          Companies may post jobs, search and contact candidates, and offer startup partnerships,
          subject to admin verification and approval of each job posting. You represent that you
          have the authority to act on behalf of the company you register, and that all information
          you submit (including verification documents) is accurate.
        </p>
        <p>
          We may reject, edit for compliance, or remove any job or company listing that violates
          these Terms, applicable law, or our content guidelines (Section 9), and may decline or
          revoke verification at our discretion.
        </p>
      </>
    ),
  },
  {
    heading: '6. Ideas, Partnerships, and Community Content',
    body: (
      <>
        <p>
          The ideas/partnerships feature lets users publish startup ideas and lets other users
          express interest as an investor or participant. Submitted ideas are reviewed by an admin
          before appearing publicly, and may be edited back to pending status if changed after
          approval. OpenOpportunity is not a party to, and does not broker, guarantee, or take any
          responsibility for, any partnership, investment, or agreement that results from a
          connection made through this feature — you deal directly with the other party, at your own
          risk and discretion.
        </p>
        <p>
          Community-income content (articles, videos, guides) is provided for general informational
          purposes only and is not financial, investment, tax, or legal advice.
        </p>
      </>
    ),
  },
  {
    heading: '7. Subscription Plans and Billing',
    body: (
      <p>
        Some features are offered under paid plans in addition to the Free plan (currently Plus and
        Pro, priced in INR as shown on the Billing page). By subscribing to a paid plan, you
        authorize us (or our payment processor) to charge the applicable fees. Prices, features, and
        plans may change; we will provide reasonable notice of material changes. Except where
        required by law, fees already paid are non-refundable, and you may cancel a paid plan at any
        time to stop future billing.
      </p>
    ),
  },
  {
    heading: '8. Prohibited Conduct',
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Provide false, misleading, or fraudulent information in a profile, job, company
            verification, or idea submission.
          </li>
          <li>
            Post job listings for roles that don't exist, or that are discriminatory or unlawful.
          </li>
          <li>Harass, discriminate against, or misrepresent yourself to another user.</li>
          <li>
            Scrape, reverse-engineer, or interfere with the Platform's normal operation or security.
          </li>
          <li>
            Use candidate or company contact information obtained through the Platform for unrelated
            marketing or spam.
          </li>
          <li>
            Upload malicious code, or content that infringes someone else's intellectual property or
            legal rights.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: '9. Content and Intellectual Property',
    body: (
      <p>
        You retain ownership of the content you submit (profiles, resumes, job listings, ideas,
        messages). By submitting content, you grant OpenOpportunity a worldwide, royalty-free
        license to host, display, and distribute it as necessary to operate and promote the Platform
        (e.g. showing your job listing to candidates, or your idea on the public community page).
        The Platform's own software, design, and branding are owned by OpenOpportunity and may not
        be copied or reused without permission.
      </p>
    ),
  },
  {
    heading: '10. Third-Party Links and Services',
    body: (
      <p>
        The Platform may link to or integrate with third-party services (e.g. "Sign in with
        Google"). We are not responsible for the content, policies, or practices of third-party
        services, and your use of them is governed by their own terms.
      </p>
    ),
  },
  {
    heading: '11. Disclaimers',
    body: (
      <p>
        THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER
        EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, OR NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED,
        ERROR-FREE, OR SECURE, OR THAT ANY JOB, CANDIDATE, PARTNERSHIP, OR IDEA LISTED ON THE
        PLATFORM IS ACCURATE, LEGITIMATE, OR SUITABLE FOR YOUR PURPOSES.
      </p>
    ),
  },
  {
    heading: '12. Limitation of Liability',
    body: (
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPENOPPORTUNITY AND ITS OFFICERS, EMPLOYEES, AND
        AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM OR
        ANY INTERACTION WITH ANOTHER USER, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR
        TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE PLATFORM WILL NOT EXCEED THE AMOUNT YOU PAID
        US, IF ANY, IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
      </p>
    ),
  },
  {
    heading: '13. Indemnification',
    body: (
      <p>
        You agree to indemnify and hold OpenOpportunity harmless from any claim, loss, or damage,
        including reasonable legal fees, arising from your use of the Platform, your content, or
        your violation of these Terms or applicable law.
      </p>
    ),
  },
  {
    heading: '14. Termination',
    body: (
      <p>
        You may stop using the Platform, or delete your account, at any time. We may suspend or
        terminate your access to the Platform, with or without notice, if we believe you have
        violated these Terms or applicable law, or for any other reason at our discretion. Sections
        of these Terms that by their nature should survive termination (including Sections 9 and
        11–13) will survive.
      </p>
    ),
  },
  {
    heading: '15. Governing Law and Dispute Resolution',
    body: (
      <p>
        These Terms are governed by the laws of India, without regard to conflict-of-law principles.
        Any dispute arising from these Terms or the Platform will be subject to the exclusive
        jurisdiction of the courts located in India, unless otherwise required by applicable law.
      </p>
    ),
  },
  {
    heading: '16. Changes to These Terms',
    body: (
      <p>
        We may update these Terms from time to time. If we make material changes, we will update the
        effective date below and, where appropriate, notify you. Continued use of the Platform after
        a change becomes effective means you accept the revised Terms.
      </p>
    ),
  },
  {
    heading: '17. Contact Us',
    body: (
      <p>
        Questions about these Terms can be sent to{' '}
        <a href="mailto:legal@openopportunity.com" className="font-semibold text-primary">
          legal@openopportunity.com
        </a>
        .
      </p>
    ),
  },
]

export default function TermsOfServicePage() {
  const { t } = useTranslation('layout')

  return (
    <main className="mx-auto max-w-[840px] px-6 py-14">
      <h1 className="mb-2 text-[32px] font-extrabold tracking-[-0.01em] text-ink">
        {t('footer.legal.termsOfService')}
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
