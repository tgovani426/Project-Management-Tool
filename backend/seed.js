require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const seedDB = async () => {
    try {
        console.log('Connecting to PostgreSQL for Seeding...');

        // Clear existing data (due to foreign keys, delete Task first)
        await prisma.task.deleteMany();
        await prisma.user.deleteMany();

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash('password123', salt);

        // Create 1 Admin
        const adminUser = await prisma.user.create({
            data: {
                name: 'Admin User',
                email: 'admin@test.com',
                password,
                role: 'ADMIN',
            }
        });

        // Create 5 Members
        const membersData = [];
        for (let i = 1; i <= 5; i++) {
            membersData.push({
                name: `Member ${i}`,
                email: `member${i}@test.com`,
                password,
                role: 'MEMBER'
            });
        }
        await prisma.user.createMany({ data: membersData });

        // Fetch back members to get their generated IDs
        const createdMembers = await prisma.user.findMany({
            where: { role: 'MEMBER' }
        });

        const tracks = [
            'Java MVC', 'Java MS', 'Mobile Citizen', 'Mobile Official',
            'React', 'Angular', 'AIML', 'QA', 'DB', 'Infra', 'BA', 'Analytics'
        ];
        const statuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
        const priorities = ['Low', 'Medium', 'High', 'Critical'];

        const tasksData = [];
        const activityLogsData = [];

        // Generate 75 tasks spanning past 3 months to next 1 month
        const today = new Date();
        const generateRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        const crypto = require('crypto');

        for (let i = 1; i <= 75; i++) {
            const taskId = crypto.randomUUID();
            const track = tracks[Math.floor(Math.random() * tracks.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const priority = priorities[Math.floor(Math.random() * priorities.length)];
            const assignee = createdMembers[Math.floor(Math.random() * createdMembers.length)].id;

            // Start date between 90 days ago and 15 days from now
            const startDate = generateRandomDate(
                new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
                new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000)
            );

            // Duration roughly between 3 to 25 days
            const durationDays = Math.floor(Math.random() * 22) + 3;
            const tentativeEndDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

            let actualEndDate = null;
            if (status === 'Completed') {
                actualEndDate = new Date(tentativeEndDate.getTime() - (Math.random() * 5 * 24 * 60 * 60 * 1000));
            }

            const commentsList = [
                'Awaiting feedback from stakeholders.',
                'Blocker: Waiting on DB provisioning.',
                'Progressing as expected.',
                'Needs review by architecture team.',
                'Client requested specific changes to the UI.',
                'Deployed to staging environment.',
                'Testing in progress.',
                'Blocked by external dependency API downtime.',
                'Code review complete, merging soon.',
                '',
                'Follow up meeting scheduled for next week.',
                'Updated the documentation.'
            ];

            tasksData.push({
                id: taskId,
                title: `${track} Task ${i}: ${priority} priority implementation`,
                track: track,
                description: `This is an auto-generated description for task ${i} under the ${track} track. Requires coordination across teams.`,
                comments: commentsList[Math.floor(Math.random() * commentsList.length)],
                startDate: startDate,
                tentativeEndDate: tentativeEndDate,
                actualEndDate: actualEndDate,
                priority: priority,
                status: status,
                assigneeId: assignee,
                createdById: adminUser.id,
            });

            activityLogsData.push({
                taskId: taskId,
                userId: adminUser.id,
                action: 'Created',
                details: 'Task was created via bulk import.',
                createdAt: startDate
            });

            if (status === 'Completed') {
                activityLogsData.push({
                    taskId: taskId,
                    userId: assignee,
                    action: 'Status Update',
                    details: 'Status changed to: Completed',
                    createdAt: actualEndDate || today
                });
            }
        }

        await prisma.task.createMany({ data: tasksData });
        await prisma.activityLog.createMany({ data: activityLogsData });

        console.log('PostgreSQL Seeding Success!');
        process.exit();
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

seedDB();
