import { prisma } from './lib/prisma.js'

const rows = await prisma.opportunity.findMany({
  where: { status: 'PUBLISHED' },
  select: { title: true, location: true, latitude: true, longitude: true, type: true, workMode: true },
})
console.log(JSON.stringify(rows, null, 2))
await prisma.$disconnect()
