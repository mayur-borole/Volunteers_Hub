import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CountdownTimer from '@/components/ui/CountdownTimer';
import EventLocationCard from '@/components/ui/EventLocationCard';
import { StarRating } from '@/components/ui/StarRating';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { eventService } from '@/services/eventService';
import { connectSocket } from '@/lib/socket';
import MessageModal from '@/components/ui/MessageModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Heart,
  Share2,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Sparkles,
  UserCheck,
  FileText,
  Phone,
  Copy,
} from 'lucide-react';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    street?: string;
    city?: string;
    area?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  date: string;
  startTime?: string;
  endTime?: string;
  instructionsForVolunteers?: string;
  registrationDeadline?: string;
  maxVolunteers: number;
  volunteers: Array<string | { _id?: string; id?: string }>;
  approvedVolunteers?: Array<string | { _id?: string; id?: string }>;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  images?: string[];
  imageUrl?: string;
  registrations?: Array<{
    volunteerId: string | { _id?: string; id?: string };
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    phone: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    cancellationReason?: string;
    rejectionReason?: string;
    createdAt?: string;
  }>;
  googleMapsLink?: string;
  averageRating?: number;
  totalRatings?: number;
  createdAt: string;
}

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    name: user?.name || '',
    age: '',
    gender: '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    setApplicationForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      phone: user?.phone || prev.phone,
    }));
  }, [user]);

  useEffect(() => {
    fetchEventDetails();

    const socket = connectSocket();
    const onRegistrationUpdated = (payload: { eventId?: string }) => {
      if (!payload?.eventId || payload.eventId === id) {
        fetchEventDetails();
      }
    };

    socket.on('registrationUpdated', onRegistrationUpdated);

    return () => {
      socket.off('registrationUpdated', onRegistrationUpdated);
    };
  }, [id]);

  const eventLink = `${window.location.origin}/events/${id}`;

  const shareText = event
    ? `${event.title} on ${new Date(event.date).toLocaleDateString()} at ${event.location}. Join me: ${eventLink}`
    : eventLink;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event?.title || 'Volunteer event',
          text: shareText,
          url: eventLink,
        });
        toast({ title: 'Shared', description: 'Event shared successfully' });
        return;
      }
    } catch (error) {
      // fallback below
    }
    setIsShareMenuOpen((prev) => !prev);
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    setIsShareMenuOpen(false);
  };

  const openMessageModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsMessageModalOpen(true);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(event?.title || 'Volunteer Event');
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsShareMenuOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventLink);
      toast({ title: 'Link copied', description: 'Event link copied to clipboard' });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the link. Please copy manually.',
        variant: 'destructive',
      });
    }
    setIsShareMenuOpen(false);
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventById(id!);
      setEvent(data.event || null);
    } catch (error: any) {
      setEvent(null);
      toast({
        title: 'Error',
        description: 'Failed to load event details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openApplyDialog = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to register for events',
      });
      navigate('/login');
      return;
    }

    if (user.role !== 'volunteer') {
      toast({
        title: 'Volunteer Account Required',
        description: 'Only volunteer accounts can apply for events.',
        variant: 'destructive',
      });
      return;
    }

    setIsApplyDialogOpen(true);
  };

  const handleRegister = async () => {
    const parsedAge = Number(applicationForm.age);

    if (!applicationForm.name.trim() || !applicationForm.gender || !applicationForm.phone.trim() || !parsedAge) {
      toast({
        title: 'Incomplete Form',
        description: 'Please fill name, age, gender, and phone before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (parsedAge < 1 || parsedAge > 120) {
      toast({
        title: 'Invalid Age',
        description: 'Please enter a valid age between 1 and 120.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setRegistering(true);
      await eventService.registerForEvent(id!, {
        name: applicationForm.name.trim(),
        age: parsedAge,
        gender: applicationForm.gender as 'male' | 'female' | 'other' | 'prefer-not-to-say',
        phone: applicationForm.phone.trim(),
      });
      toast({
        title: 'Application Submitted',
        description: 'Your request is pending organizer approval.',
      });
      setIsApplyDialogOpen(false);
      fetchEventDetails(); // Refresh event data
    } catch (error: any) {
      toast({
        title: 'Application Failed',
        description: error.response?.data?.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    const normalizedReason = cancelReason.trim();

    if (!normalizedReason) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (normalizedReason.length < 10) {
      toast({
        title: 'Reason Too Short',
        description: 'Please provide at least 10 characters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setRegistering(true);
      await eventService.cancelRegistration(id!, normalizedReason);
      toast({
        title: isRegistered ? 'Left Event' : 'Application Cancelled',
        description: isRegistered
          ? 'You have been removed from this event.'
          : 'Your application has been cancelled.',
      });
      setIsCancelDialogOpen(false);
      setCancelReason('');
      fetchEventDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to unregister',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const myRegistration =
    user &&
    event?.registrations?.find((registration) => {
      const volunteerId =
        typeof registration.volunteerId === 'string'
          ? registration.volunteerId
          : registration.volunteerId?._id || registration.volunteerId?.id;
      return volunteerId === user.id;
    });
  const isRegistered = myRegistration?.status === 'approved';
  const isOrganizer = user && event?.organizer._id === user.id;
  const approvedCount = event?.approvedVolunteers?.length ?? event?.volunteers.length ?? 0;
  const registrationProgress = event
    ? (approvedCount / event.maxVolunteers) * 100
    : 0;
  const spotsLeft = event ? event.maxVolunteers - approvedCount : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <Button onClick={() => navigate('/events')}>Browse Events</Button>
        </div>
      </div>
    );
  }

  const allImages = [
    ...(event.images || []),
    ...(event.imageUrl ? [event.imageUrl] : []),
  ].filter(Boolean);

  const bannerImage = allImages.length > 0
    ? allImages[currentImageIndex]
    : '';

  const fullAddress = [
    event.address?.street,
    event.address?.area,
    event.address?.city,
    event.address?.state,
    event.address?.zipCode,
    event.address?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const mapQuery = encodeURIComponent(fullAddress || event.location || event.title);
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  const formatTime12Hour = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const timeRange =
    event.startTime && event.endTime
      ? `${formatTime12Hour(event.startTime)} - ${formatTime12Hour(event.endTime)}`
      : event.startTime
      ? formatTime12Hour(event.startTime)
      : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Banner Section */}
      <div className="relative h-96 overflow-hidden">
        {bannerImage ? (
          <motion.img
            key={currentImageIndex}
            src={bannerImage}
            alt={event.title}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Calendar className="h-20 w-20 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Floating Badges */}
        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
          <Badge className="bg-primary text-primary-foreground shadow-sm border border-primary/20 px-4 py-2">
            <Tag className="h-4 w-4 mr-2" />
            {event.category}
          </Badge>
          <Badge
            className={`px-4 py-2 shadow-sm border ${
              event.status === 'upcoming'
                ? 'bg-blue-500/90 text-white border-blue-400/40'
                : event.status === 'completed'
                ? 'bg-green-500/90 text-white border-green-400/40'
                : 'bg-red-500/90 text-white border-red-400/40'
            }`}
          >
            {event.status.toUpperCase()}
          </Badge>
        </div>

        {/* Image Navigation */}
        {allImages.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        )}

        {/* Title Overlay */}
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-3"
          >
            {event.title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-4 text-sm"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>
            {timeRange && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {timeRange}
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {fullAddress || event.location}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Countdown Timer - temporarily disabled while testing completion/certificates */}
            {false && event.status === 'upcoming' && event.date && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
              >
                <CountdownTimer targetDate={event.date} />
              </motion.div>
            )}

            {/* Volunteer Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">Volunteer Registration</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.volunteers.length} / {event.maxVolunteers} volunteers
                      {event.approvedVolunteers ? ` (${event.approvedVolunteers.length} approved)` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(registrationProgress)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {spotsLeft} spots left
                  </div>
                </div>
              </div>
              <Progress value={registrationProgress} className="h-3" />
              {registrationProgress >= 90 && spotsLeft > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Almost full! Register now to secure your spot
                </motion.p>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                About This Event
              </h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </motion.div>

            {/* Event Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
            >
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Event Information
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Date:</span> {formattedDate}</p>
                <p><span className="font-medium text-foreground">Time:</span> {timeRange || 'Time TBD'}</p>
                <p><span className="font-medium text-foreground">Location:</span> {fullAddress || event.location}</p>
                <p><span className="font-medium text-foreground">Organizer:</span> {event.organizer?.name || 'Organizer'}</p>
              </div>
            </motion.div>

            {event.instructionsForVolunteers && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
              >
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Instructions for Volunteers
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {event.instructionsForVolunteers}
                </p>
              </motion.div>
            )}

            {/* Location */}
            {event.coordinates && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <EventLocationCard
                  event={{
                    title: event.title,
                    location: event.location,
                    coordinates: {
                      latitude: event.coordinates.latitude,
                      longitude: event.coordinates.longitude,
                    },
                    address: event.address,
                  }}
                />
              </motion.div>
            )}

            {!event.coordinates && (event.googleMapsLink || fullAddress || event.location) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
              >
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Event Location Map
                </h3>
                {event.googleMapsLink ? (
                  <a
                    href={event.googleMapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mb-3 text-sm text-primary hover:underline"
                  >
                    Open in Google Maps
                  </a>
                ) : null}
                <iframe
                  title="Event Location"
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                  className="w-full h-80 rounded-xl border"
                  loading="lazy"
                />
              </motion.div>
            )}

            {/* Rating Section (for completed events) */}
            {event.status === 'completed' && event.totalRatings && event.totalRatings > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card/75 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm"
              >
                <h3 className="font-semibold text-lg mb-4">Event Rating</h3>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">
                      {event.averageRating?.toFixed(1)}
                    </div>
                    <StarRating rating={event.averageRating || 0} interactive={false} />
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.totalRatings} ratings
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-sm sticky top-6"
            >
              <div className="space-y-4">
                {/* Registration Deadline */}
                {event.registrationDeadline && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Registration Deadline
                    </p>
                    <p className="text-sm mt-1">
                      {new Date(event.registrationDeadline).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {!isOrganizer && myRegistration && (
                  <div
                    className={`p-3 rounded-xl border text-sm ${
                      myRegistration.status === 'approved'
                        ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
                        : myRegistration.status === 'pending'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                        : myRegistration.status === 'cancelled'
                        ? 'bg-muted border-border text-muted-foreground'
                        : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                    }`}
                  >
                    Application status: <span className="font-semibold uppercase">{myRegistration.status}</span>
                    {myRegistration.status === 'cancelled' && myRegistration.cancellationReason ? (
                      <p className="mt-1 text-xs italic text-destructive">Reason: {myRegistration.cancellationReason}</p>
                    ) : null}
                    {myRegistration.status === 'rejected' && myRegistration.rejectionReason ? (
                      <p className="mt-1 text-xs">Reason: {myRegistration.rejectionReason}</p>
                    ) : null}
                  </div>
                )}

                {/* Register Button */}
                {!isOrganizer && user?.role === 'volunteer' && event.status === 'upcoming' && (
                  <>
                    {isRegistered ? (
                      <Button
                        onClick={() => setIsCancelDialogOpen(true)}
                        disabled={registering}
                        variant="outline"
                        className="w-full rounded-xl"
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Unregister
                      </Button>
                    ) : myRegistration?.status === 'pending' ? (
                      <Button
                        onClick={() => setIsCancelDialogOpen(true)}
                        disabled={registering}
                        variant="outline"
                        className="w-full rounded-xl"
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Withdraw Application
                      </Button>
                    ) : myRegistration?.status === 'cancelled' ? (
                      <Button
                        onClick={openApplyDialog}
                        disabled={registering || spotsLeft === 0}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        Apply Again
                      </Button>
                    ) : (
                      <Button
                        onClick={openApplyDialog}
                        disabled={registering || spotsLeft === 0}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                      >
                        {registering ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Submitting...
                          </>
                        ) : spotsLeft === 0 ? (
                          'Event Full'
                        ) : (
                          <>
                            <Heart className="mr-2 h-4 w-4" />
                            {myRegistration?.status === 'rejected' ? 'Apply Again' : 'Apply Now'}
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}

                {/* Message Organizer */}
                {!isOrganizer && (
                  <Button variant="outline" className="w-full" onClick={openMessageModal}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message Organizer
                  </Button>
                )}

                {/* Call Organizer */}
                {(event.organizer?.phone || event.organizer?.email) && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={event.organizer?.phone ? `tel:${event.organizer.phone}` : `mailto:${event.organizer.email}`}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call Organizer
                    </a>
                  </Button>
                )}

                {/* Share Button */}
                <div className="relative w-full">
                  <Button variant="outline" className="w-full" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Event
                  </Button>

                  {isShareMenuOpen && (
                    <div className="absolute left-0 right-0 mt-2 rounded-lg border border-border bg-card shadow-lg z-10 p-2 space-y-2">
                      <Button variant="ghost" className="w-full justify-start" onClick={shareViaWhatsApp}>
                        WhatsApp
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={shareViaEmail}>
                        Email
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={copyLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                    </div>
                  )}
                </div>

                {/* Organizer Info */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Organized by</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {event.organizer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{event.organizer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.organizer.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for this Event</DialogTitle>
            <DialogDescription>
              Fill in your details. Your request will stay pending until the organizer approves it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="apply-name">Full Name</Label>
              <Input
                id="apply-name"
                value={applicationForm.name}
                onChange={(event) =>
                  setApplicationForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-age">Age</Label>
              <Input
                id="apply-age"
                type="number"
                min={1}
                max={120}
                value={applicationForm.age}
                onChange={(event) =>
                  setApplicationForm((prev) => ({ ...prev, age: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-gender">Gender</Label>
              <Select
                value={applicationForm.gender}
                onValueChange={(value) =>
                  setApplicationForm((prev) => ({ ...prev, gender: value }))
                }
              >
                <SelectTrigger id="apply-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apply-phone">Phone Number</Label>
              <Input
                id="apply-phone"
                value={applicationForm.phone}
                onChange={(event) =>
                  setApplicationForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)} disabled={registering}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={registering}>
              {registering ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRegistered ? 'Leave Event' : 'Cancel Application'}</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason">Reason (minimum 10 characters)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Type your reason here..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setCancelReason('');
              }}
              disabled={registering}
            >
              Cancel
            </Button>
            <Button onClick={handleUnregister} disabled={registering} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {registering ? 'Submitting...' : isRegistered ? 'Leave Event' : 'Cancel Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {event && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          eventId={event._id}
          eventTitle={event.title}
          recipientId={event.organizer._id}
          recipientName={event.organizer.name}
        />
      )}
    </div>
  );
};

export default EventDetails;
