import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/components/ui/use-toast';

const formSchema = z.object({
  schoolName: z.string().min(2, 'School name is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(10, 'A valid phone number is required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  estimatedStudents: z.coerce.number().positive('Must be a positive number'),
});

const EnrollPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      estimatedStudents: 100,
    },
  });

  const handlePincodeChange = useCallback(async (pincode: string) => {
    if (pincode.length === 6) {
      setIsFetchingPincode(true);
      try {
        const response = await fetch(`/api/pincode/${pincode}`);
        if (response.ok) {
          const { city, state } = await response.json();
          form.setValue('city', city);
          form.setValue('state', state);
        } else {
          toast({ title: 'Invalid Pincode', description: 'Could not fetch details for the entered pincode.', variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'An Error Occurred', description: 'Please try again later.', variant: 'destructive' });
      } finally {
        setIsFetchingPincode(false);
      }
    }
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        const { error } = await response.json();
        toast({ title: 'Submission Failed', description: error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'An Error Occurred', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Enroll Your School</CardTitle>
          </CardHeader>
          <CardContent>
            {showSuccessMessage ? (
              <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-green-600 mb-4">Application Submitted!</h2>
                <p>Thank you for your interest. We will review your application and get back to you soon.</p>
                <p className="mt-2">You will be redirected to the home page shortly.</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="schoolName" render={({ field }) => (
                    <FormItem><FormLabel>School Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactName" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactPhone" render={({ field }) => (
                    <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem><FormLabel>Website (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormMessage>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="zipCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP / Postal Code</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              handlePincodeChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="estimatedStudents" render={({ field }) => (
                    <FormItem><FormLabel>Estimated Number of Students</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={isSubmitting || isFetchingPincode} className="w-full">
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
      <Toaster />
    </>
  );
};

export default EnrollPage;