import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const passwordHash = await bcrypt.hash('EventLink1', 12)

async function userWithOrg({ email, firstName, lastName, org }) {
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'PROVIDER',
      firstName,
      lastName,
      organization: { create: org },
    },
    include: { organization: true },
  })
}

function date(iso) {
  return new Date(iso)
}

await prisma.application.deleteMany()
await prisma.savedItem.deleteMany()
await prisma.opportunity.deleteMany()
await prisma.profile.deleteMany()
await prisma.refreshToken.deleteMany()
await prisma.organization.deleteMany()
await prisma.user.deleteMany()

await prisma.user.create({
  data: {
    email: 'hana.testaye@example.com',
    passwordHash,
    role: 'SEEKER',
    firstName: 'Hana',
    lastName: 'Testaye',
    profile: {
      create: {
        university: 'Addis Ababa University',
        fieldOfStudy: 'Computer Science',
        educationLevel: 'Undergraduate',
        skills: ['Figma', 'UX research', 'Prototyping', 'Python'],
        interests: ['Product design', 'Technology', 'Social impact'],
        locations: ['Addis Ababa', 'Ethiopia'],
        workModes: ['HYBRID', 'REMOTE'],
        careerGoals: 'I want to design useful accessible digital products and grow into a product designer at a team solving real problems in Africa.',
        bio: 'I am a Computer Science student exploring how thoughtful design can make complex experiences clearer. I combine user research, prototyping and a passion for social impact to build accessible digital products.',
        projects: [
          { title: 'Campus Connect', summary: 'A campus directory that helps students find communities.', tech: ['Figma', 'UX research'] },
          { title: 'Access for All', summary: 'An accessibility checklist for student software projects.', tech: ['Prototyping'] },
        ],
        visibility: 'private',
        completeness: 100,
        aiSummary: 'Undergraduate in Computer Science at Addis Ababa University. Focused on Product design, Technology, Social impact. I want to design useful accessible digital products and grow into a product designer at a team solving real problems in Africa.',
        version: 1,
      },
    },
  },
})

const nova = await userWithOrg({
  email: 'nova@eventlink.test',
  firstName: 'Nova',
  lastName: 'Labs',
  org: {
    name: 'Nova Labs',
    description: 'A product studio building digital tools for growing African businesses.',
    industry: 'Product design',
    website: 'https://example.com/nova',
    contactEmail: 'nova@eventlink.test',
    location: 'Addis Ababa, Ethiopia',
    verificationStatus: 'APPROVED',
  },
})

const futures = await userWithOrg({
  email: 'futures@eventlink.test',
  firstName: 'Open',
  lastName: 'Futures',
  org: {
    name: 'Open Futures Foundation',
    description: 'Scholarships for students building technology with community impact.',
    industry: 'Education',
    location: 'Ethiopia',
    contactEmail: 'futures@eventlink.test',
    verificationStatus: 'APPROVED',
  },
})

const collective = await userWithOrg({
  email: 'collective@eventlink.test',
  firstName: 'Addis',
  lastName: 'Collective',
  org: {
    name: 'Addis Tech Collective',
    description: 'A community of builders running hackathons across Ethiopia.',
    industry: 'Community',
    location: 'Addis Ababa, Ethiopia',
    contactEmail: 'collective@eventlink.test',
    verificationStatus: 'APPROVED',
  },
})

const circle = await userWithOrg({
  email: 'circle@eventlink.test',
  firstName: 'Design',
  lastName: 'Circle',
  org: {
    name: 'Design Circle Africa',
    description: 'Workshops for designers and developers.',
    industry: 'Design education',
    location: 'Remote',
    contactEmail: 'circle@eventlink.test',
    verificationStatus: 'APPROVED',
  },
})

await userWithOrg({
  email: 'kite@eventlink.test',
  firstName: 'Kite',
  lastName: 'Digital',
  org: {
    name: 'Kite Digital',
    description: 'A new studio waiting for verification.',
    industry: 'Software',
    location: 'Addis Ababa',
    contactEmail: 'kite@eventlink.test',
    verificationStatus: 'PENDING',
  },
})

await prisma.user.create({
  data: {
    email: 'admin@eventlink.test',
    passwordHash,
    role: 'ADMIN',
    firstName: 'EventLink',
    lastName: 'Admin',
  },
})

const listings = [
  {
    orgId: nova.organization.id,
    title: 'Product Design Intern',
    type: 'INTERNSHIP',
    category: 'Internships & Jobs',
    description: 'Join a small, collaborative team building digital tools for growing African businesses. You will turn real user needs into clear, accessible product experiences, with mentorship from our design team.',
    responsibilities: 'Explore user problems through interviews and lightweight research.\nCreate wireframes and high-fidelity prototypes in Figma.\nCollaborate with engineers and contribute to our design system.',
    eligibility: 'Currently enrolled in an undergraduate program in Ethiopia.\nAvailable for a three-month hybrid internship in Addis Ababa.\nComfortable with Figma and core UX design principles.\nA portfolio with at least one design project.',
    audience: 'Undergraduate',
    requiredSkills: ['Figma', 'UX research'],
    location: 'Addis Ababa, Ethiopia',
    workMode: 'HYBRID',
    compensation: 'PAID',
    duration: '3 months',
    closesAt: date('2026-12-04'),
    applyUrl: 'https://example.com/apply/product-design',
    viewCount: 920,
    applyClicks: 48,
  },
  {
    orgId: futures.organization.id,
    title: 'Future Builders Scholarship',
    type: 'SCHOLARSHIP',
    category: 'Scholarships & Grants',
    description: 'A funded year of study support for undergraduates using technology for community impact.',
    responsibilities: '',
    eligibility: 'Open to undergraduates in Ethiopia with a project that serves a community.',
    audience: 'Undergraduate',
    requiredSkills: ['Technology'],
    location: 'Ethiopia',
    workMode: 'REMOTE',
    compensation: 'FUNDED',
    duration: '1 year',
    closesAt: date('2026-12-12'),
    applyUrl: 'https://example.com/apply/scholarship',
    viewCount: 640,
    applyClicks: 30,
  },
  {
    orgId: collective.organization.id,
    title: 'Build for Africa 2026',
    type: 'HACKATHON',
    category: 'Hackathons & Competitions',
    description: 'A 48-hour challenge to prototype tools for local problems, with mentors from product and engineering teams.',
    responsibilities: 'Form a team, pick a brief, and demo a working prototype.',
    eligibility: 'Open to students and early-career builders. Teams of up to four.',
    audience: 'Any',
    requiredSkills: ['Prototyping'],
    location: 'Addis Ababa, Ethiopia',
    workMode: 'ONSITE',
    compensation: 'FREE',
    duration: '48 hours',
    closesAt: date('2026-11-28'),
    startsAt: date('2026-11-28'),
    applyUrl: 'https://example.com/apply/hackathon',
    viewCount: 510,
    applyClicks: 24,
  },
  {
    orgId: circle.organization.id,
    title: 'Design Systems, From Zero',
    type: 'WORKSHOP',
    category: 'Workshops & Training',
    description: 'A practical workshop on tokens, components and documentation for small product teams.',
    responsibilities: '',
    eligibility: 'Designers and developers who have shipped at least one interface.',
    audience: 'Any',
    requiredSkills: ['Figma'],
    location: 'Remote',
    workMode: 'REMOTE',
    compensation: 'FREE',
    duration: '1 day',
    closesAt: date('2026-12-06'),
    startsAt: date('2026-12-06'),
    applyUrl: 'https://example.com/apply/design-systems',
    viewCount: 330,
    applyClicks: 16,
  },
  {
    orgId: nova.organization.id,
    title: 'UX Research Intern',
    type: 'INTERNSHIP',
    category: 'Internships & Jobs',
    description: 'Help our team understand users and turn insights into better products. You will support interviews, synthesize findings and collaborate with product designers on accessible digital experiences.',
    responsibilities: 'Plan interview guides.\nTake notes and cluster findings.\nShare insights with the design team.',
    eligibility: 'Undergraduate student who can work hybrid in Addis Ababa.',
    audience: 'Undergraduate',
    requiredSkills: ['UX research', 'Figma'],
    location: 'Addis Ababa, Ethiopia',
    workMode: 'HYBRID',
    compensation: 'PAID',
    duration: '3 months',
    closesAt: date('2026-12-18'),
    applyUrl: 'https://example.com/apply/ux-research',
    viewCount: 410,
    applyClicks: 18,
  },
  {
    orgId: nova.organization.id,
    title: 'Frontend Developer Intern',
    type: 'INTERNSHIP',
    category: 'Internships & Jobs',
    description: 'Build accessible interfaces with React for products used by small businesses.',
    responsibilities: 'Implement UI from Figma.\nWrite clear components and basic tests.',
    eligibility: 'Students who have built a React project.',
    audience: 'Undergraduate',
    requiredSkills: ['React', 'JavaScript'],
    location: 'Addis Ababa, Ethiopia',
    workMode: 'HYBRID',
    compensation: 'PAID',
    duration: '3 months',
    closesAt: date('2026-12-10'),
    applyUrl: 'https://example.com/apply/frontend',
    viewCount: 710,
    applyClicks: 36,
  },
  {
    orgId: collective.organization.id,
    title: 'Build for Better Hackathon',
    type: 'HACKATHON',
    category: 'Hackathons & Competitions',
    description: 'A weekend build focused on public-interest software.',
    responsibilities: '',
    eligibility: 'Open to students. Some coding experience is useful.',
    audience: 'Undergraduate',
    requiredSkills: ['JavaScript'],
    location: 'Addis Ababa, Ethiopia',
    workMode: 'ONSITE',
    compensation: 'FREE',
    duration: '2 days',
    closesAt: date('2026-11-29'),
    startsAt: date('2026-11-29'),
    applyUrl: 'https://example.com/apply/better',
    viewCount: 520,
    applyClicks: 24,
  },
  {
    orgId: circle.organization.id,
    title: 'Product Thinking Workshop',
    type: 'WORKSHOP',
    category: 'Workshops & Training',
    description: 'Learn how to frame a problem, talk to users and decide what not to build.',
    responsibilities: '',
    eligibility: 'Open to undergraduates interested in product design.',
    audience: 'Undergraduate',
    requiredSkills: ['Product design'],
    location: 'Remote',
    workMode: 'REMOTE',
    compensation: 'FREE',
    duration: 'Half day',
    closesAt: date('2026-12-08'),
    startsAt: date('2026-12-08'),
    applyUrl: 'https://example.com/apply/product-thinking',
    viewCount: 330,
    applyClicks: 16,
  },
]

for (const listing of listings) {
  await prisma.opportunity.create({
    data: { ...listing, status: 'PUBLISHED' },
  })
}

console.log('Seeded EventLink demo data. Password for every demo account: EventLink1')
await prisma.$disconnect()
