path = 'resources/js/pages/pre-orders/dashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename Planning Matrices -> Production Report
content = content.replace('Planning Matrices', 'Production Report', 1)

# 2. Change TabsList bg
content = content.replace(
    'className="bg-muted/50 p-1"',
    'className="bg-muted/60 p-1 rounded-lg gap-1"',
    1
)

# 3. Replace all tab trigger active classes (white -> blue-600)
content = content.replace(
    'data-[state=active]:bg-white data-[state=active]:shadow-sm',
    'data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
