const fs = require('fs');

const indexCode = fs.readFileSync('c:\\tsinukdal\\company-system-main\\resources\\js\\pages\\Budget\\WeeklyBudget\\Index.tsx', 'utf8');

let financeCode = indexCode.replace(/export default function WeeklyBudgetIndex/g, 'export default function WeeklyBudgetFinance');
financeCode = financeCode.replace(/title="Weekly Budgets"/g, 'title="Weekly Budgets - Finance View"');
financeCode = financeCode.replace(/<h1 className="text-2xl font-bold">Weekly Budgets<\/h1>/g, '<h1 className="text-2xl font-bold">Weekly Budgets - Finance View</h1>');

// Just copying it initially. I will modify it via further replacements or just write the JS script to do the complex replacements.
fs.writeFileSync('c:\\tsinukdal\\company-system-main\\resources\\js\\pages\\Budget\\WeeklyBudget\\Finance.tsx', financeCode);
console.log("Finance.tsx created successfully");
