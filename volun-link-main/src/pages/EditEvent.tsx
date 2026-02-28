import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { eventService } from '@/services/eventService';
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const categories = [
  'Education',
  'Healthcare',
  'Environment',
  'Social Welfare',
  'Disaster Relief',
  'Other',
];

const hourOptions = Array.from({ length: 12 }, (_, idx) => String(idx + 1).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0'));

const parse12HourTime = (value: string) => {
  const match = (value || '').trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) {
    return { hour: '09', minute: '00', period: 'AM' as 'AM' | 'PM' };
  }
  const hour = String(parseInt(match[1], 10)).padStart(2, '0');
  const minute = match[2];
  const period = match[3].toUpperCase() as 'AM' | 'PM';
  return { hour, minute, period };
};

const build12HourTime = (hour: string, minute: string, period: string) => `${hour}:${minute} ${period}`;

const eventSchema = Yup.object().shape({
  title: Yup.string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters')
    .required('Title is required'),
  description: Yup.string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .required('Description is required'),
  category: Yup.string()
    .oneOf(categories, 'Invalid category')
    .required('Category is required'),
  instructionsForVolunteers: Yup.string().max(2000, 'Instructions must be less than 2000 characters'),
  date: Yup.string().required('Event date is required'),
  startTime: Yup.string().matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s(AM|PM)$/i, 'Use 12-hour format').required('Start time is required'),
  endTime: Yup.string().matches(/^(0?[1-9]|1[0-2]):[0-5]\d\s(AM|PM)$/i, 'Use 12-hour format').required('End time is required'),
  maxVolunteers: Yup.number()
    .min(1, 'At least 1 volunteer required')
    .max(500, 'Maximum 500 volunteers allowed')
    .required('Maximum volunteers is required'),
  city: Yup.string().required('City is required'),
  area: Yup.string().required('Area is required'),
  address: Yup.string().required('Full address is required'),
  googleMapsLink: Yup.string()
    .url('Please enter a valid URL')
    .matches(/google.*maps|goo\.gl/, 'Please provide a Google Maps link'),
});

const formatDateForInput = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatTimeForInput = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const EditEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [initialValues, setInitialValues] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to edit events',
        variant: 'destructive',
      });
      navigate('/login');
    } else if (user.role !== 'organizer' && user.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only organizers can edit events',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, toast]);

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await eventService.getEventById(id);
        const event = (response as any).event || (response as any).data?.event || response;

        const city = event.address?.city || '';
        const area = event.address?.area || '';
        const street = event.address?.street || '';

        setInitialValues({
          title: event.title || '',
          description: event.description || '',
          category: (event.category || '').charAt(0).toUpperCase() + (event.category || '').slice(1),
          instructionsForVolunteers: event.instructionsForVolunteers || '',
          maxVolunteers: event.maxVolunteers || 10,
          date: formatDateForInput(event.date),
          startTime: formatTimeForInput(event.startTime),
          endTime: formatTimeForInput(event.endTime),
          registrationDeadline: formatDateForInput(event.registrationDeadline),
          city,
          area,
          address: street,
          googleMapsLink: event.googleMapsLink || '',
        });
      } catch (error: any) {
        console.error('Failed to load event for editing', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to load event',
          variant: 'destructive',
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id, navigate, toast]);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    try {
      setIsSubmitting(true);

      const eventData: any = {
        title: values.title,
        description: values.description,
        category: values.category.toLowerCase(),
        instructionsForVolunteers: values.instructionsForVolunteers,
        maxVolunteers: values.maxVolunteers,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        registrationDeadline: values.registrationDeadline || undefined,
        location: `${values.area}, ${values.city}`,
        address: {
          street: values.address,
          city: values.city,
          area: values.area,
        },
        googleMapsLink: values.googleMapsLink,
      };

      const response = await eventService.updateEvent(id, eventData as any);

      toast({
        title: 'Success!',
        description: response.message || 'Event updated successfully.',
      });

      navigate(`/events/${id}`);
    } catch (error: any) {
      console.error('Event update error:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update event',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !initialValues) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-block p-3 bg-card/80 border border-border/60 rounded-2xl mb-4 shadow-sm"
          >
            <Sparkles className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-2">
            Edit Event
          </h1>
          <p className="text-muted-foreground">
            Update the details of your volunteering event
          </p>
        </div>

        {/* Form */}
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={eventSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue }) => (
            <Form className="space-y-6">
              {/* Basic Information Section */}
              <FormSection
                icon={<FileText className="h-5 w-5" />}
                title="Basic Information"
                delay={0.3}
              >
                <div className="space-y-4">
                  <FloatingLabelInput
                    name="title"
                    label="Event Title"
                    placeholder="e.g., Beach Cleanup Drive at Marina Beach"
                  />

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium mb-2">
                      Event Description
                    </Label>
                    <Field
                      as={Textarea}
                      id="description"
                      name="description"
                      placeholder="Describe your event in detail... What will volunteers do? What impact will they make?"
                      rows={6}
                      className={`resize-none bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        errors.description && touched.description
                          ? 'border-destructive'
                          : ''
                      }`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <ErrorMessage
                        name="description"
                        component="p"
                        className="text-xs text-destructive"
                      />
                      <span className="text-xs text-muted-foreground">
                        {values.description.length}/2000
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm font-medium mb-2">
                      Category
                    </Label>
                    <Field
                      as="select"
                      id="category"
                      name="category"
                      className="w-full px-4 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="category"
                      component="p"
                      className="text-xs text-destructive mt-1"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Requirements Section */}
              <FormSection
                icon={<Users className="h-5 w-5" />}
                title="Volunteer Requirements"
                delay={0.4}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <FloatingLabelInput
                    name="maxVolunteers"
                    label="Maximum Volunteers"
                    type="number"
                    min={1}
                    max={500}
                  />
                  <div>
                    <Label htmlFor="registrationDeadline" className="text-sm font-medium mb-2">
                      Registration Deadline (Optional)
                    </Label>
                    <Field as={Input} id="registrationDeadline" name="registrationDeadline" type="date" className="bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30" />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="instructionsForVolunteers" className="text-sm font-medium mb-2">
                    Instructions for Volunteers
                  </Label>
                  <Field
                    as={Textarea}
                    id="instructionsForVolunteers"
                    name="instructionsForVolunteers"
                    rows={4}
                    placeholder="Share dress code, reporting time, materials to bring, safety rules, or other instructions."
                    className="resize-none bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                  <ErrorMessage
                    name="instructionsForVolunteers"
                    component="p"
                    className="text-xs text-destructive mt-1"
                  />
                </div>
              </FormSection>

              <FormSection
                icon={<Clock className="h-5 w-5" />}
                title="Date & Time"
                delay={0.5}
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium mb-2">
                      Event Date
                    </Label>
                    <Field as={Input} id="date" name="date" type="date" className="bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30" />
                    <ErrorMessage name="date" component="p" className="text-xs text-destructive mt-1" />
                  </div>

                  <Field name="startTime">
                    {({ field }: any) => {
                      const parsed = parse12HourTime(field.value || '09:00 AM');
                      return (
                        <div>
                          <Label className="text-sm font-medium mb-2">Start Time</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              className="px-3 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                              value={parsed.hour}
                              onChange={(e) => setFieldValue('startTime', build12HourTime(e.target.value, parsed.minute, parsed.period))}
                            >
                              {hourOptions.map((hour) => (
                                <option key={`start-hour-${hour}`} value={hour}>{hour}</option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                              value={parsed.minute}
                              onChange={(e) => setFieldValue('startTime', build12HourTime(parsed.hour, e.target.value, parsed.period))}
                            >
                              {minuteOptions.map((minute) => (
                                <option key={`start-minute-${minute}`} value={minute}>{minute}</option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                              value={parsed.period}
                              onChange={(e) => setFieldValue('startTime', build12HourTime(parsed.hour, parsed.minute, e.target.value))}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          <ErrorMessage name="startTime" component="p" className="text-xs text-destructive mt-1" />
                        </div>
                      );
                    }}
                  </Field>

                  <Field name="endTime">
                    {({ field }: any) => {
                      const parsed = parse12HourTime(field.value || '11:00 AM');
                      return (
                        <div>
                          <Label className="text-sm font-medium mb-2">End Time</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              className="px-3 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                              value={parsed.hour}
                              onChange={(e) => setFieldValue('endTime', build12HourTime(e.target.value, parsed.minute, parsed.period))}
                            >
                              {hourOptions.map((hour) => (
                                <option key={`end-hour-${hour}`} value={hour}>{hour}</option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                              value={parsed.minute}
                              onChange={(e) => setFieldValue('endTime', build12HourTime(parsed.hour, e.target.value, parsed.period))}
                            >
                              {minuteOptions.map((minute) => (
                                <option key={`end-minute-${minute}`} value={minute}>{minute}</option>
                              ))}
                            </select>
                            <select
                              className="px-3 py-2 rounded-xl border border-border/70 bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                              value={parsed.period}
                              onChange={(e) => setFieldValue('endTime', build12HourTime(parsed.hour, parsed.minute, e.target.value))}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          <ErrorMessage name="endTime" component="p" className="text-xs text-destructive mt-1" />
                        </div>
                      );
                    }}
                  </Field>
                </div>
              </FormSection>

              {/* Location Section */}
              <FormSection
                icon={<MapPin className="h-5 w-5" />}
                title="Event Location"
                delay={0.6}
              >
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FloatingLabelInput name="city" label="City" />
                    <FloatingLabelInput name="area" label="Area / Locality" />
                  </div>
                  <FloatingLabelInput
                    name="address"
                    label="Full Address"
                    placeholder="e.g., 123 Main Street, Near Central Park"
                  />
                  <FloatingLabelInput
                    name="googleMapsLink"
                    label="Google Maps Link (Optional)"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </FormSection>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex gap-4 justify-end pt-6"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                  className="rounded-xl border-border/70 hover:bg-muted/50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-32 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </motion.div>
            </Form>
          )}
        </Formik>
      </motion.div>
    </div>
  );
};

// Form Section Component
interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  delay: number;
  children: React.ReactNode;
}

const FormSection = ({ icon, title, delay, children }: FormSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">{icon}</div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
};

// Floating Label Input Component
interface FloatingLabelInputProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

const FloatingLabelInput = ({
  name,
  label,
  type = 'text',
  placeholder,
  min,
  max,
}: FloatingLabelInputProps) => {
  return (
    <div className="relative">
      <Label htmlFor={name} className="text-sm font-medium mb-2">
        {label}
      </Label>
      <Field name={name}>
        {({ field, meta }: any) => (
          <>
            <Input
              {...field}
              id={name}
              type={type}
              placeholder={placeholder}
              min={min}
              max={max}
              className={`bg-background/80 border-border/70 focus-visible:ring-2 focus-visible:ring-primary/30 ${
                meta.error && meta.touched ? 'border-destructive' : ''
              }`}
            />
            {meta.error && meta.touched && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 mt-1 text-xs text-destructive"
              >
                <AlertCircle className="h-3 w-3" />
                {meta.error}
              </motion.div>
            )}
          </>
        )}
      </Field>
    </div>
  );
};

export default EditEvent;
