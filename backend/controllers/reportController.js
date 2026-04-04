const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const generateReport = async (req, res) => {
    try {
        const { type, month, year, startDate, endDate, track, status } = req.query;

        // Base filter
        let filter = {};

        // Optional filters
        if (track && track !== 'All') filter.track = track;
        if (status && status !== 'All') filter.status = status;

        // Date logic
        let dateRangeTitle = 'All Time';
        if (type === 'monthly') {
            if (!month || !year) {
                return res.status(400).json({ message: 'Month and year are required for monthly reports' });
            }
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            const startOfMonth = new Date(y, m - 1, 1);
            const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

            filter.startDate = { lte: endOfMonth };
            filter.OR = [
                { status: { not: 'Completed' } },
                { status: 'Completed', actualEndDate: { gte: startOfMonth } },
                { status: 'Completed', actualEndDate: null, updatedAt: { gte: startOfMonth } }
            ];
            const monthName = startOfMonth.toLocaleString('default', { month: 'long' });
            dateRangeTitle = `${monthName} ${y}`;
        } else if (type === 'range') {
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required for range reports' });
            }
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            filter.startDate = { lte: end };
            filter.OR = [
                { status: { not: 'Completed' } },
                { status: 'Completed', actualEndDate: { gte: start } },
                { status: 'Completed', actualEndDate: null, updatedAt: { gte: start } }
            ];
            dateRangeTitle = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
        }

        const tasks = await prisma.task.findMany({
            where: filter,
            include: {
                assignee: { select: { name: true, email: true } },
                createdBy: { select: { name: true, email: true } }
            }
        });

        // Aggregations
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const onHold = tasks.filter(t => t.status === 'On Hold').length;

        // Use virtual isDelayed or calculate
        const delayedTasks = tasks.filter(t => {
            if (t.status === 'Completed') return false;
            return new Date(t.tentativeEndDate) < new Date();
        }).length;

        const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Track-wise breakdown
        const trackBreakdown = {};
        tasks.forEach(t => {
            if (!trackBreakdown[t.track]) {
                trackBreakdown[t.track] = { track: t.track, total: 0, completed: 0, delayed: 0 };
            }
            trackBreakdown[t.track].total++;
            if (t.status === 'Completed') trackBreakdown[t.track].completed++;
            if (t.status !== 'Completed' && new Date(t.tentativeEndDate) < new Date()) {
                trackBreakdown[t.track].delayed++;
            }
        });
        const trackBreakdownArray = Object.values(trackBreakdown);

        // Assignee performance (Top contributors)
        const assigneePerformance = {};
        tasks.forEach(t => {
            if (t.status === 'Completed' && t.assignee) {
                const name = t.assignee.name || 'Unknown';
                if (!assigneePerformance[name]) {
                    assigneePerformance[name] = 0;
                }
                assigneePerformance[name]++;
            }
        });

        const topContributors = Object.entries(assigneePerformance)
            .map(([name, completedCount]) => ({ name, completedCount }))
            .sort((a, b) => b.completedCount - a.completedCount)
            .slice(0, 5);

        // Load EJS template
        const templatePath = path.join(__dirname, '../views', 'reportTemplate.ejs');
        const templateHtml = fs.readFileSync(templatePath, 'utf8');

        // Render HTML
        const html = ejs.render(templateHtml, {
            dateRangeTitle,
            generatedOn: new Date().toLocaleDateString(),
            generatedBy: req.user.name,
            totalTasks,
            completedTasks,
            inProgress,
            onHold,
            delayedTasks,
            completionPercentage,
            trackBreakdown: trackBreakdownArray,
            topContributors,
            tasks
        });

        // Generate PDF Document
        // Note: '--no-sandbox' and '--disable-dev-shm-usage' are required on Linux servers
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',   // Prevents crashes on low /dev/shm memory
                '--disable-gpu',             // Not needed on headless Linux
                '--no-zygote',              // Avoids process spawning issues on some distros
            ]
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

        await browser.close();

        // Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Task_Report_${type}.pdf`);
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Server Error generating report' });
    }
};

module.exports = { generateReport };
