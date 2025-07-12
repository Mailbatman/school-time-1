import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/prisma';
import { GetServerSideProps } from 'next';
import { School } from '@prisma/client';

interface SchoolsPageProps {
  schools: School[];
}

const SchoolsPage = ({ schools: initialSchools }: SchoolsPageProps) => {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim()) return;
    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSchoolName }),
      });
      if (response.ok) {
        const newSchool = await response.json();
        setSchools([...schools, newSchool]);
        setNewSchoolName('');
      } else {
        console.error('Failed to create school');
      }
    } catch (error) {
      console.error('Error creating school:', error);
    }
  };

  const handleUpdateSchool = async () => {
    if (!editingSchool || !editingSchool.name.trim()) return;
    try {
      const response = await fetch(`/api/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSchool.name }),
      });
      if (response.ok) {
        const updatedSchool = await response.json();
        setSchools(schools.map(s => s.id === updatedSchool.id ? updatedSchool : s));
        setEditingSchool(null);
      } else {
        console.error('Failed to update school');
      }
    } catch (error) {
      console.error('Error updating school:', error);
    }
  };

  const handleDeleteSchool = async (id: string) => {
    try {
      const response = await fetch(`/api/schools/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSchools(schools.filter(s => s.id !== id));
      } else {
        console.error('Failed to delete school');
      }
    } catch (error) {
      console.error('Error deleting school:', error);
    }
  };

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow p-4 md:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Manage Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="New school name"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
                <Button onClick={handleCreateSchool}>Add School</Button>
              </div>
              <ul className="space-y-2">
                {schools.map((school) => (
                  <li key={school.id} className="flex items-center justify-between p-2 border rounded">
                    {editingSchool?.id === school.id ? (
                      <Input
                        value={editingSchool.name}
                        onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                      />
                    ) : (
                      <span>{school.name}</span>
                    )}
                    <div className="flex gap-2">
                      {editingSchool?.id === school.id ? (
                        <Button onClick={handleUpdateSchool}>Save</Button>
                      ) : (
                        <Button onClick={() => setEditingSchool(school)}>Edit</Button>
                      )}
                      <Button variant="destructive" onClick={() => handleDeleteSchool(school.id)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const schools = await prisma.school.findMany();
  return {
    props: { schools: JSON.parse(JSON.stringify(schools)) },
  };
};

export default SchoolsPage;