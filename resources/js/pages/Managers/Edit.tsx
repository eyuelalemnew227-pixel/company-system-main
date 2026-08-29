import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Branch, type Department, type EmployeeOption } from '@/types';
import { type Manager } from '@/types/managers';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Managers',
    href: '/managers',
  },
  {
    title: 'Edit Manager',
    href: null,
  },
];

interface EditProps {
  manager: Manager & { employee_name: string; team_members: number[] };
  employees: EmployeeOption[];
  branches: Branch[];
  departments: Department[];
}

export default function EditManager({ manager, employees, branches, departments }: EditProps) {
  const { data, setData, put, errors, processing } = useForm({
    employee_id: manager.employee_id.toString(),
    team_members: manager.team_members || [],
    branch_id: '',
    department_id: '',
  });

  const [openEmployee, setOpenEmployee] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [openDepartment, setOpenDepartment] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(
    employees.find(emp => emp.id === manager.employee_id) || null
  );
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const filteredDepartments = selectedBranch ? selectedBranch.departments : departments;

  const filteredEmployees = employees.filter(emp => {
    if (emp.id.toString() === data.employee_id) return false;
    if (data.branch_id && emp.branch_id !== parseInt(data.branch_id)) return false;
    if (data.department_id && emp.department_id !== parseInt(data.department_id)) return false;
    return true;
  });

  useEffect(() => {
    setSelectedEmployee(employees.find(emp => emp.id === parseInt(data.employee_id)) || null);
  }, [data.employee_id, employees]);

  function handleEmployeeSelect(employee: EmployeeOption) {
    setData('employee_id', employee.id.toString());
    setSelectedEmployee(employee);
    setOpenEmployee(false);
  }

  function handleBranchSelect(branch: Branch) {
    setData({
      ...data,
      branch_id: branch.id.toString(),
      department_id: '', // Reset department as it’s branch-specific
    });
    setSelectedBranch(branch);
    setSelectedDepartment(null);
    setOpenBranch(false);
  }

  function handleDepartmentSelect(department: Department) {
    setData({
      ...data,
      department_id: department.id.toString(),
    });
    setSelectedDepartment(department);
    setOpenDepartment(false);
  }

  function handleTeamMemberToggle(employeeId: number, checked: boolean) {
    if (checked) {
      setData('team_members', [...data.team_members, employeeId]);
    } else {
      setData('team_members', data.team_members.filter(id => id !== employeeId));
    }
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    put(`/managers/${manager.id}`);
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Edit Manager" />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Edit Manager</CardTitle>
            <CardAction>
              <Link href="/managers">
                <Button variant="default">Go Back</Button>
              </Link>
            </CardAction>
          </CardHeader>
          <hr />
          <CardContent>
            <form onSubmit={submit}>
              <div className="mb-4">
                <Label htmlFor="employee_id">Select Manager (Employee)</Label>
                <Popover open={openEmployee} onOpenChange={setOpenEmployee}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedEmployee ? selectedEmployee.name : 'Search and select employee...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.name}
                              onSelect={() => handleEmployeeSelect(employee)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  data.employee_id === employee.id.toString() ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {employee.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <InputError message={errors.employee_id} />
              </div>

              <div className="mb-4">
                <Label htmlFor="branch_id">Select Branch</Label>
                <Popover open={openBranch} onOpenChange={setOpenBranch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedBranch ? selectedBranch.name : 'Select branch...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search branches..." />
                      <CommandList>
                        <CommandEmpty>No branches found.</CommandEmpty>
                        <CommandGroup>
                          {branches.map((branch) => (
                            <CommandItem
                              key={branch.id}
                              value={branch.name}
                              onSelect={() => handleBranchSelect(branch)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  data.branch_id === branch.id.toString() ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {branch.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <InputError message={errors.branch_id} />
              </div>

              <div className="mb-4">
                <Label htmlFor="department_id">Select Department</Label>
                <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={!selectedBranch}
                    >
                      {selectedDepartment ? selectedDepartment.name : 'Select department...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search departments..." />
                      <CommandList>
                        <CommandEmpty>No departments found.</CommandEmpty>
                        <CommandGroup>
                          {filteredDepartments.map((department) => (
                            <CommandItem
                              key={department.id}
                              value={department.name}
                              onSelect={() => handleDepartmentSelect(department)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  data.department_id === department.id.toString() ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {department.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <InputError message={errors.department_id} />
              </div>

              <div className="mb-4">
                <Label>Select Team Members</Label>
                <div className="my-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`team-${employee.id}`}
                          checked={data.team_members.includes(employee.id)}
                          onCheckedChange={(checked) => handleTeamMemberToggle(employee.id, !!checked)}
                        />
                        <Label htmlFor={`team-${employee.id}`}>{employee.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <InputError message={errors.team_members} />
              </div>

              <div className="flex justify-end">
                <Button size="lg" type="submit" disabled={processing}>
                  Update
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}