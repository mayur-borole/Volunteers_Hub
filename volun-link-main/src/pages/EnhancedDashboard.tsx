import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CountdownTimer from '@/components/ui/CountdownTimer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { eventService } from '@/services/eventService';
import { analyticsService } from '@/services/analyticsService';
import { userService } from '@/services/userService';
import { messageService, Message as ChatMessage } from '@/services/messageService';
import { connectSocket } from '@/lib/socket';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Heart,
  CheckCircle,
  XCircle,
  Sparkles,
  TrendingUp,
  Target,
  Award,
  MessageCircle,
  Phone,
  Star,
} from 'lucide-react';
import MessageModal from '@/components/ui/MessageModal';

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  organizer: {
    _id: string;
    name: string;
  };
  location: string;
  date: string;
  startTime?: string;
  endTime?: string;
  maxVolunteers: number;
  volunteers: string[];
  approvedVolunteers?: string[];
  registrations?: Array<{
    volunteerId: string | { _id?: string; id?: string; name?: string; email?: string; phone?: string };
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    phone: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    cancellationReason?: string;
    createdAt?: string;
    rejectionReason?: string;
    // Attendance fields set after event completion
    present?: boolean;
    attendanceMarkedAt?: string;
    workDuration?: string;
    certificateGenerated?: boolean;
    // Ratings & feedback
    organizerRating?: number | null;
    volunteerFeedback?: string;
    volunteerRatingForEvent?: number | null;
    certificateUrl?: string | null;
  }>;
  myRegistration?: {
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    cancellationReason?: string;
    rejectionReason?: string;
    // Attendance & certificate info for the current volunteer
    present?: boolean;
    attendanceMarkedAt?: string | null;
    workDuration?: string;
    certificateGenerated?: boolean;
    // Ratings & feedback
    organizerRating?: number | null;
    volunteerFeedback?: string;
    volunteerRatingForEvent?: number | null;
    certificateUrl?: string | null;
  };
  status: 'upcoming' | 'ongoing' | 'active' | 'completed' | 'cancelled';
  images?: string[];
  imageUrl?: string;
  createdAt: string;
  attendanceLocked?: boolean;
  isDeleted?: boolean;
}

interface RegistrationUpdatePayload {
  eventId: string;
  volunteerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'removed';
  source?: string;
  eventTitle?: string;
}

const getVolunteerId = (volunteer: string | { _id?: string; id?: string }) =>
  typeof volunteer === 'string' ? volunteer : volunteer?._id || volunteer?.id || '';

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [appliedEvents, setAppliedEvents] = useState<Event[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [organizerRating, setOrganizerRating] = useState<number>(0);
  const [certificates, setCertificates] = useState<
    Array<{
      certificateId: string;
      eventId: string;
      eventName: string;
      workTime?: string;
      organizerRating?: number | null;
      certificateURL: string;
      issuedAt?: string;
      volunteerRatingForEvent?: number | null;
      volunteerFeedback?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [messageContext, setMessageContext] = useState<{
    eventId: string;
    eventTitle: string;
    recipientId: string;
    recipientName: string;
  } | null>(null);
  const [inboxContext, setInboxContext] = useState<{
    eventId: string;
    eventTitle: string;
  } | null>(null);
  const [inboxMessages, setInboxMessages] = useState<ChatMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [certificateContext, setCertificateContext] = useState<{
    eventId: string;
    volunteerId: string;
    volunteerName: string;
  } | null>(null);
  const [feedbackContext, setFeedbackContext] = useState<{
    eventId: string;
    eventTitle: string;
  } | null>(null);
  const [submittedFeedbackEventIds, setSubmittedFeedbackEventIds] = useState<Set<string>>(new Set());
  const [completeEventContext, setCompleteEventContext] = useState<Event | null>(null);
  const [finalizeAttendanceContext, setFinalizeAttendanceContext] = useState<{ eventId: string; eventTitle: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'created' | 'applied'>(
    isOrganizer ? 'created' : 'applied'
  );

  const mapCertificateFromProfile = (cert: any, idx: number) => ({
    certificateId: cert?._id || `cert-${idx}`,
    eventId: String(cert?.eventId || cert?.event || ''),
    eventName: cert?.eventName || cert?.eventTitle || 'Event',
    workTime: cert?.workTime || cert?.workDuration || '',
    organizerRating: typeof cert?.rating === 'number' ? cert.rating : null,
    certificateURL: cert?.certificateURL || cert?.url || '',
    issuedAt: cert?.issuedAt,
    volunteerRatingForEvent: null,
    volunteerFeedback: '',
  });

  const refreshVolunteerRealtimeData = async () => {
    if (!user || user.role !== 'volunteer') return;

    try {
      const [profileResp, completedResp] = await Promise.all([
        userService.getProfile(),
        eventService.getCompletedEventsForVolunteer(),
      ]);

      const profileUser = profileResp?.user || profileResp?.data?.user;
      if (profileUser) {
        const certs = Array.isArray(profileUser.certificates) ? profileUser.certificates : [];
        setCertificates(certs.map(mapCertificateFromProfile));
      }

      const completedList = completedResp?.events || completedResp?.data?.events || [];
      const safeCompleted = Array.isArray(completedList) ? completedList : [];
      setCompletedEvents(safeCompleted);
      const submittedIds = new Set(
        safeCompleted
          .filter((event: Event) => !!event?.myRegistration?.volunteerFeedback || typeof event?.myRegistration?.volunteerRatingForEvent === 'number')
          .map((event: Event) => event._id)
      );
      setSubmittedFeedbackEventIds(submittedIds);
    } catch (error) {
      console.error('Failed to refresh volunteer realtime data', error);
    }
  };

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish
    if (!user) {
      navigate('/login'); // Redirect if not logged in
      return;
    }
    fetchEvents();

    const socket = connectSocket();
    const onRegistrationUpdated = (payload?: RegistrationUpdatePayload) => {
      fetchEvents();

      const isApprovedForMe =
        payload?.status === 'approved' &&
        payload?.volunteerId &&
        user?.id &&
        payload.volunteerId === user.id;

      if (isApprovedForMe) {
        toast({
          title: 'Application approved',
          description: payload?.eventTitle
            ? `Organizer approved your request for ${payload.eventTitle}.`
            : 'Organizer approved your request.',
        });
      }
    };
    socket.on('registrationUpdated', onRegistrationUpdated);

    const onCertificateReady = (payload?: { eventId?: string; volunteerId?: string; url?: string }) => {
      if (!payload || !user || user.role !== 'volunteer') return;
      if (payload.volunteerId && payload.volunteerId === user.id) {
        toast({
          title: 'Certificate ready',
          description: 'Your certificate has been generated for a completed event.',
        });
        refreshVolunteerRealtimeData();
      }
    };

    // Real-time: volunteer rated by organizer
    const onVolunteerRated = (payload?: { eventId?: string; volunteerId?: string; rating?: number; eventTitle?: string }) => {
      if (!payload || !user || user.role !== 'volunteer') return;
      if (payload.volunteerId && payload.volunteerId === user.id) {
        toast({
          title: 'You were rated',
          description: payload.eventTitle
            ? `Organizer rated you ${payload.rating}/5 for ${payload.eventTitle}.`
            : 'Organizer submitted a rating for you.',
        });
        refreshVolunteerRealtimeData();
      }
    };

    // Real-time: organizer receives feedback from volunteer
    const onFeedbackSubmitted = (payload?: { eventId?: string; rating?: number; feedback?: string; eventTitle?: string }) => {
      if (!payload || !user || (user.role !== 'organizer' && user.role !== 'admin')) return;
      toast({
        title: 'New feedback received',
        description: payload.eventTitle
          ? `You received ${payload.rating}/5 feedback for ${payload.eventTitle}.`
          : 'You received new event feedback from a volunteer.',
      });
      fetchEvents();
    };

    socket.on('volunteerRated', onVolunteerRated as any);
    socket.on('ratingUpdated', onVolunteerRated as any);
    socket.on('feedbackSubmitted', onFeedbackSubmitted as any);
    socket.on('certificateReady', onCertificateReady as any);
    socket.on('certificateGenerated', onCertificateReady as any);

    const onEventCompleted = () => {
      if (user?.role === 'volunteer') {
        refreshVolunteerRealtimeData();
        return;
      }
      fetchEvents();
    };

    const onEventDeleted = () => {
      if (user?.role === 'volunteer') {
        refreshVolunteerRealtimeData();
        return;
      }
      fetchEvents();
    };

    socket.on('eventCompleted', onEventCompleted as any);
    socket.on('eventDeleted', onEventDeleted as any);

    const intervalId = window.setInterval(() => {
      fetchEvents();
    }, 10000);

    const handleFocus = () => {
      fetchEvents();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      socket.off('registrationUpdated', onRegistrationUpdated);
      socket.off('volunteerRated', onVolunteerRated as any);
      socket.off('ratingUpdated', onVolunteerRated as any);
      socket.off('feedbackSubmitted', onFeedbackSubmitted as any);
      socket.off('certificateReady', onCertificateReady as any);
      socket.off('certificateGenerated', onCertificateReady as any);
      socket.off('eventCompleted', onEventCompleted as any);
      socket.off('eventDeleted', onEventDeleted as any);
    };
  }, [user, authLoading]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const eventId = query.get('eventId');

    if (!eventId) return;

    setActiveTab('created');
    setFocusedEventId(eventId);

    const elementId = `event-card-${eventId}`;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.search, createdEvents.length]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch events created by user (only for organizers/admins)
      if (user?.role === 'organizer' || user?.role === 'admin') {
        try {
          const created = await eventService.getMyEvents();
          setCreatedEvents(created.events || []);
        } catch (error) {
          console.log('User cannot create events, skipping my-events fetch');
          setCreatedEvents([]);
        }
      } else {
        setCreatedEvents([]);
      }

      // Fetch events user has applied to (shows all statuses)
      try {
        const applied = await eventService.getAppliedEvents();
        const appliedList = applied?.events || applied?.data?.events || [];

        // First, try applied endpoint
        let finalApplied = appliedList;

        // Fallback to legacy /user/registered endpoint if needed
        if (finalApplied.length === 0) {
          const registeredFallback = await eventService.getRegisteredEvents();
          const registeredList = registeredFallback?.events || registeredFallback?.data?.events || [];
          finalApplied = registeredList;
        }

        setAppliedEvents(Array.isArray(finalApplied) ? finalApplied : []);

        // If still nothing, show upcoming events as suggestions on this section
        if (finalApplied.length === 0) {
          try {
            const resp = await eventService.getAllEvents({ status: 'upcoming', limit: 6, sort: 'date', approved: 'true' as any });
            const list = resp?.events || resp?.data?.events || [];
            setSuggestedEvents(Array.isArray(list) ? list : []);
          } catch (e) {
            setSuggestedEvents([]);
          }
        } else {
          setSuggestedEvents([]);
        }
      } catch (error) {
        console.error('Failed to fetch applied events', error);
      }

      // Load analytics/profile extras
      if (user?.role === 'volunteer') {
        try {
          const [profileResp, completedResp] = await Promise.all([
            userService.getProfile(),
            eventService.getCompletedEventsForVolunteer(),
          ]);

          const profileUser = profileResp?.user || profileResp?.data?.user;

          const certList = Array.isArray(profileUser?.certificates) ? profileUser.certificates : [];
          setCertificates(certList.map(mapCertificateFromProfile));

          const completedList = completedResp?.events || completedResp?.data?.events || [];
          const safeCompleted = Array.isArray(completedList) ? completedList : [];
          setCompletedEvents(safeCompleted);
          const submittedIds = new Set(
            safeCompleted
              .filter((event: Event) => !!event?.myRegistration?.volunteerFeedback || typeof event?.myRegistration?.volunteerRatingForEvent === 'number')
              .map((event: Event) => event._id)
          );
          setSubmittedFeedbackEventIds(submittedIds);
        } catch (e) {
          // Non-fatal for dashboard
        }
      } else if (isOrganizer) {
        try {
          const orgResp = await analyticsService.getOrganizerStats();
          const stats = orgResp?.stats || orgResp?.data?.stats || null;
          if (stats?.averageEventRating != null) {
            setOrganizerRating(stats.averageEventRating);
          }
        } catch (e) {
          // Ignore analytics failure for now
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await eventService.deleteEvent(eventId);
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      fetchEvents();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const handleApproveRegistration = async (eventId: string, volunteerId: string) => {
    try {
      setModerating(true);
      await eventService.approveRegistration(eventId, volunteerId);
      toast({
        title: 'Success',
        description: 'Volunteer request approved',
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const handleRejectRegistration = async (eventId: string, volunteerId: string) => {
    const reason = window.prompt('Optional rejection reason:', '') || '';

    try {
      setModerating(true);
      await eventService.rejectRegistration(eventId, volunteerId, reason);
      toast({
        title: 'Success',
        description: 'Volunteer request rejected',
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const handleRemoveRegistration = async (eventId: string, volunteerId: string) => {
    if (!confirm('Remove this volunteer registration?')) return;

    try {
      setModerating(true);
      await eventService.removeRegistration(eventId, volunteerId);
      toast({
        title: 'Success',
        description: 'Registration removed',
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to remove registration',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const handleCompleteEvent = (event: Event) => {
    setCompleteEventContext(event);
  };

  const confirmCompleteEvent = async () => {
    if (!completeEventContext) return;
    const eventId = completeEventContext._id;

    try {
      setModerating(true);
      await eventService.completeEvent(eventId);
      toast({
        title: 'Event completed',
        description: 'The event has been marked as completed.',
      });
      setCompleteEventContext(null);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to complete event',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const handleUpdateAttendance = async (
    eventId: string,
    volunteerId: string,
    present: boolean,
    workDuration: string
  ) => {
    if (present && (!workDuration || !workDuration.trim())) {
      toast({
        title: 'Work duration required',
        description: 'Please enter the hours of work for present volunteers.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setModerating(true);
      await eventService.updateAttendance(eventId, {
        volunteerId,
        present,
        workDuration: workDuration.trim() || undefined,
      });
      toast({
        title: 'Attendance updated',
        description: 'Attendance has been saved for this volunteer.',
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error updating attendance',
        description: error?.response?.data?.message || 'Failed to update attendance',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const handleFinalizeAttendance = (eventId: string, eventTitle: string) => {
    setFinalizeAttendanceContext({ eventId, eventTitle });
  };

  const confirmFinalizeAttendance = async () => {
    if (!finalizeAttendanceContext) return;
    const eventId = finalizeAttendanceContext.eventId;

    try {
      setModerating(true);
      await eventService.finalizeAttendance(eventId);
      toast({
        title: 'Attendance finalized',
        description: 'Attendance has been locked and certificates generated for present volunteers.',
      });
      setFinalizeAttendanceContext(null);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error finalizing attendance',
        description: error?.response?.data?.message || 'Failed to finalize attendance',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const handleRateVolunteer = async (eventId: string, volunteerId: string) => {
    const input = window.prompt('Rate this volunteer (1-5):', '5');
    if (input == null) return;

    const rating = Number(input);
    if (!rating || rating < 1 || rating > 5) {
      toast({
        title: 'Invalid rating',
        description: 'Please enter a number between 1 and 5.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setModerating(true);
      await eventService.rateVolunteer(eventId, volunteerId, rating);
      toast({
        title: 'Volunteer rated',
        description: 'Your rating has been saved for this volunteer.',
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error rating volunteer',
        description: error?.response?.data?.message || 'Failed to submit rating',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const openMessageModal = (ctx: { eventId: string; eventTitle: string; recipientId: string; recipientName: string }) => {
    setMessageContext(ctx);
  };

  const openInbox = async (eventId: string, eventTitle: string) => {
    setInboxContext({ eventId, eventTitle });
    setInboxLoading(true);
    try {
      const messages = await messageService.getEventMessages(eventId);
      setInboxMessages(Array.isArray(messages) ? messages : []);
    } catch (error) {
      setInboxMessages([]);
    } finally {
      setInboxLoading(false);
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'ongoing':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Event['status']) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />;
      case 'ongoing':
        return <TrendingUp className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const safeAppliedEvents = Array.isArray(appliedEvents) ? appliedEvents : [];
  const safeCompletedEvents = (Array.isArray(completedEvents) ? completedEvents : []).filter(
    (event) => !event?.isDeleted
  );
  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  const ongoingEvents = safeAppliedEvents.filter(
    (event) =>
      !event?.isDeleted &&
      (event?.status === 'upcoming' || event?.status === 'ongoing' || event?.status === 'active')
  );

  const sectionCardClass =
    'rounded-2xl border border-border/60 bg-background/85 dark:bg-white/5 backdrop-blur-sm p-5 space-y-3 shadow-sm transition-all duration-300 hover:shadow-md';

  const subtleButtonClass = 'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]';

  // Stats for user
  const stats = {
    totalCreated: createdEvents.length,
    totalApplied: safeAppliedEvents.length,
    upcomingCreated: createdEvents.filter((e) => e.status === 'upcoming').length,
    upcomingApplied: safeAppliedEvents.filter((e) => e.status === 'upcoming').length,
    completedCreated: createdEvents.filter((e) => e.status === 'completed').length,
    completedApplied: safeAppliedEvents.filter((e) => e.status === 'completed').length,
    pendingApplied: safeAppliedEvents.filter((e) => e.myRegistration?.status === 'pending').length,
  };

  const isEarlyCompletion =
    !!completeEventContext?.date &&
    Number.isFinite(new Date(completeEventContext.date).getTime()) &&
    new Date(completeEventContext.date) > new Date();


  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mx-auto mb-4">⏳</div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-muted-foreground">
                Track your volunteering journey and manage your events
              </p>
              {isOrganizer && organizerRating > 0 && (
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <span>Organizer rating:</span>
                  <div className="flex items-center gap-0.5 text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < Math.round(organizerRating) ? 'fill-yellow-400' : 'fill-transparent'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-xs">({organizerRating.toFixed(1)}/5)</span>
                </div>
              )}
            </div>
            {isOrganizer && (
              <Button
                onClick={() => navigate('/events/create')}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isOrganizer && (
              <StatCard
                icon={<Target className="h-6 w-6" />}
                label="Events Created"
                value={stats.totalCreated}
                subtext={`${stats.upcomingCreated} upcoming`}
                delay={0.1}
              />
            )}
            {!isOrganizer && (
              <StatCard
                icon={<Heart className="h-6 w-6" />}
                label="Events Applied"
                value={stats.totalApplied}
                subtext={`${stats.upcomingApplied} upcoming`}
                delay={0.2}
              />
            )}
            <StatCard
              icon={<Award className="h-6 w-6" />}
              label="Completed"
              value={stats.completedCreated + stats.completedApplied}
              subtext="Total events"
              delay={0.3}
            />
            <StatCard
              icon={<Sparkles className="h-6 w-6" />}
              label="Impact Score"
              value={stats.completedApplied * 10}
              subtext="Volunteer hours"
              delay={0.4}
            />
          </div>
          {stats.pendingApplied > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
              You have {stats.pendingApplied} pending application{stats.pendingApplied > 1 ? 's' : ''} awaiting organizer approval.
            </p>
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-10 rounded-xl bg-muted/50 backdrop-blur-sm">
            {isOrganizer && (
              <TabsTrigger value="created" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Events Created
                {stats.totalCreated > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.totalCreated}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {!isOrganizer && (
              <TabsTrigger value="applied" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Events Applied
                {stats.totalApplied > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.totalApplied}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Events Created Tab (organizers only) */}
          {isOrganizer && (
            <TabsContent value="created">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {createdEvents.length === 0 ? (
                  <EmptyState
                    icon={<Target className="h-16 w-16" />}
                    title="No events created yet"
                    description="Start making a difference by creating your first volunteer event"
                    action={
                      <Button
                        onClick={() => navigate('/events/create')}
                        className="bg-gradient-to-r from-primary to-secondary"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Event
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {createdEvents.map((event, index) => (
                      <EventCard
                        key={event._id}
                        event={event}
                        index={index}
                        isOrganizer={true}
                        focused={focusedEventId === event._id}
                        onDelete={() => handleDeleteEvent(event._id)}
                        onEdit={() => navigate(`/events/${event._id}/edit`)}
                        onView={() => navigate(`/events/${event._id}`)}
                        onApproveRegistration={handleApproveRegistration}
                        onRejectRegistration={handleRejectRegistration}
                        onRemoveRegistration={handleRemoveRegistration}
                        onMessage={openMessageModal}
                        onOpenInbox={openInbox}
                        onCompleteEvent={handleCompleteEvent}
                        onUpdateAttendance={handleUpdateAttendance}
                        onFinalizeAttendance={handleFinalizeAttendance}
                        onRateVolunteer={handleRateVolunteer}
                        moderating={moderating}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          )}

          {/* Events Applied Tab (volunteers only) */}
          {!isOrganizer && (
            <TabsContent value="applied" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <motion.div layout className={sectionCardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        Certificates
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Download your certificates for completed events
                      </p>
                    </div>
                    <Badge variant="secondary">{safeCertificates.length} total</Badge>
                  </div>
                  {safeCertificates.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {safeCertificates.map((cert, idx) => (
                        <motion.div
                          key={cert.certificateId || cert.certificateURL + idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.04 }}
                          className="flex items-center justify-between gap-3 border border-border/60 rounded-xl px-3 py-3 text-xs bg-background/60 hover:bg-primary/5 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <Award className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground line-clamp-1">{cert.eventName}</p>
                            <p className="text-muted-foreground">
                              {cert.workTime ? `Hours: ${cert.workTime}` : 'Hours: N/A'}
                              {typeof cert.organizerRating === 'number' && (
                                <span className="ml-2">
                                  Rating: {cert.organizerRating}/5
                                </span>
                              )}
                              {cert.issuedAt && (
                                <span className="ml-2">
                                  Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`text-xs ${subtleButtonClass}`}
                              onClick={() => window.open(cert.certificateURL, '_blank')}
                            >
                              Download
                            </Button>
                            {!submittedFeedbackEventIds.has(String(cert.eventId || '')) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`text-[10px] h-6 px-2 ${subtleButtonClass}`}
                                onClick={() =>
                                  setFeedbackContext({
                                    eventId: cert.eventId,
                                    eventTitle: cert.eventName,
                                  })
                                }
                              >
                                Feedback
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`text-[10px] h-6 px-2 text-destructive hover:bg-destructive/10 ${subtleButtonClass}`}
                              onClick={async () => {
                                if (!confirm('Remove this certificate from your dashboard? This will not delete the PDF file itself.')) return;
                                try {
                                  await userService.deleteMyCertificate(cert.certificateId);
                                  setCertificates((prev) => prev.filter((c) => c.certificateId !== cert.certificateId));
                                  toast({
                                    title: 'Certificate removed',
                                    description: 'The certificate has been removed from your profile.',
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: 'Error removing certificate',
                                    description: error?.response?.data?.message || 'Failed to remove certificate',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-3">
                      No certificates yet. Certificates will appear after organizer finalizes attendance.
                    </p>
                  )}
                </motion.div>

                <motion.div layout className={sectionCardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Completed Events (Present)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Events where your attendance was marked present
                      </p>
                    </div>
                    <Badge variant="secondary">{safeCompletedEvents.length}</Badge>
                  </div>
                  {safeCompletedEvents.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                      {safeCompletedEvents.map((event) => (
                        <div
                          key={event._id}
                          className="flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground line-clamp-1">{event.title}</p>
                            <p className="text-muted-foreground">
                              {event.date ? new Date(event.date).toLocaleDateString() : 'Date TBD'}
                              <span className="ml-2">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {typeof event.location === 'string'
                                  ? event.location
                                  : (event.location as any)?.city || 'Location TBD'}
                              </span>
                            </p>
                            <p className="text-muted-foreground mt-1">
                              {event.myRegistration?.workDuration && (
                                <span>
                                  Hours: {event.myRegistration.workDuration}
                                </span>
                              )}
                              {typeof event.myRegistration?.organizerRating === 'number' && (
                                <span className="ml-2">
                                  Organizer rating: {event.myRegistration.organizerRating}/5
                                </span>
                              )}
                              {event.myRegistration?.certificateUrl && (
                                <span className="ml-2 text-primary cursor-pointer" onClick={() => window.open(event.myRegistration?.certificateUrl || '', '_blank')}>
                                  View certificate
                                </span>
                              )}
                            </p>
                            {event.myRegistration?.volunteerFeedback && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                Your feedback: {event.myRegistration.volunteerFeedback}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Badge className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                              PRESENT
                            </Badge>
                            {event.myRegistration?.present && !submittedFeedbackEventIds.has(event._id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`text-[10px] h-6 px-2 ${subtleButtonClass}`}
                                onClick={() =>
                                  setFeedbackContext({
                                    eventId: event._id,
                                    eventTitle: event.title,
                                  })
                                }
                              >
                                Give Feedback
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-3">
                      No completed events yet.
                    </p>
                  )}
                </motion.div>

                <motion.div layout className={sectionCardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Ongoing Events
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Active/upcoming events you are currently part of
                      </p>
                    </div>
                    <Badge variant="secondary">{ongoingEvents.length}</Badge>
                  </div>

                  {ongoingEvents.length > 0 ? (
                    <div className="space-y-4">
                      {ongoingEvents.map((event, index) => (
                        <EventCard
                          key={event._id}
                          event={event}
                          index={index}
                          isOrganizer={false}
                          focused={false}
                          onView={() => navigate(`/events/${event._id}`)}
                          onMessage={openMessageModal}
                        />
                      ))}
                    </div>
                  ) : suggestedEvents.length > 0 ? (
                    <div className="space-y-4">
                      {suggestedEvents.map((event, index) => (
                        <EventCard
                          key={event._id}
                          event={event}
                          index={index}
                          isOrganizer={false}
                          focused={false}
                          onView={() => navigate(`/events/${event._id}`)}
                          onMessage={openMessageModal}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-3">
                      No ongoing events right now.
                    </p>
                  )}
                </motion.div>
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </div>
      {messageContext && (
        <MessageModal
          isOpen={Boolean(messageContext)}
          onClose={() => setMessageContext(null)}
          eventId={messageContext.eventId}
          eventTitle={messageContext.eventTitle}
          recipientId={messageContext.recipientId}
          recipientName={messageContext.recipientName}
        />
      )}

      {inboxContext && (
        <InboxModal
          isOpen={Boolean(inboxContext)}
          onClose={() => setInboxContext(null)}
          messages={inboxMessages}
          loading={inboxLoading}
          currentUserId={user?.id || ''}
          eventTitle={inboxContext.eventTitle}
          onOpenThread={(recipientId, recipientName) => {
            setInboxContext(null);
            setMessageContext({
              eventId: inboxContext.eventId,
              eventTitle: inboxContext.eventTitle,
              recipientId,
              recipientName,
            });
          }}
        />
      )}

      {certificateContext && (
        <CertificateModal
          isOpen={Boolean(certificateContext)}
          onClose={() => setCertificateContext(null)}
          eventId={certificateContext.eventId}
          volunteerId={certificateContext.volunteerId}
          volunteerName={certificateContext.volunteerName}
        />
      )}

      {feedbackContext && (
        <FeedbackModal
          isOpen={Boolean(feedbackContext)}
          onClose={() => setFeedbackContext(null)}
          eventId={feedbackContext.eventId}
          eventTitle={feedbackContext.eventTitle}
          onSubmitted={() => {
            if (feedbackContext?.eventId) {
              setSubmittedFeedbackEventIds((prev) => {
                const next = new Set(prev);
                next.add(feedbackContext.eventId);
                return next;
              });
            }
            fetchEvents();
          }}
        />
      )}

      <ActionConfirmModal
        isOpen={Boolean(completeEventContext)}
        title="Complete Event"
        description={
          isEarlyCompletion
            ? 'The event date has not yet arrived. Are you sure you want to complete this event early? This will mark it as preponed or completed in advance.'
            : 'Mark this event as completed? You will then be able to record attendance.'
        }
        confirmLabel={moderating ? 'Completing...' : 'Complete Event'}
        onCancel={() => setCompleteEventContext(null)}
        onConfirm={confirmCompleteEvent}
        loading={moderating}
      />

      <ActionConfirmModal
        isOpen={Boolean(finalizeAttendanceContext)}
        title="Finalize Attendance"
        description="Finalize attendance and generate certificates for all present volunteers? This action locks attendance and cannot be edited afterwards."
        confirmLabel={moderating ? 'Finalizing...' : 'Finalize & Generate'}
        onCancel={() => setFinalizeAttendanceContext(null)}
        onConfirm={confirmFinalizeAttendance}
        loading={moderating}
      />
    </div>
  );
};

interface ActionConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ActionConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: ActionConfirmModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-background/95 dark:bg-zinc-900/90 backdrop-blur-md shadow-xl p-6"
          >
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="outline" onClick={onCancel} disabled={loading} className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={loading} className="bg-gradient-to-r from-primary to-secondary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
  delay: number;
}

const StatCard = ({ icon, label, value, subtext, delay }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-background/80 dark:bg-white/5 backdrop-blur-sm border border-border/60 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </motion.div>
  );
};

// Event Card Component
interface EventCardProps {
  event: Event;
  index: number;
  isOrganizer: boolean;
  focused: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onView: () => void;
  onApproveRegistration?: (eventId: string, volunteerId: string) => void;
  onRejectRegistration?: (eventId: string, volunteerId: string) => void;
  onRemoveRegistration?: (eventId: string, volunteerId: string) => void;
  onMessage?: (ctx: { eventId: string; eventTitle: string; recipientId: string; recipientName: string }) => void;
  onOpenInbox?: (eventId: string, eventTitle: string) => void;
  moderating?: boolean;
  onCompleteEvent?: (event: Event) => void;
  onUpdateAttendance?: (
    eventId: string,
    volunteerId: string,
    present: boolean,
    workDuration: string
  ) => void;
  onFinalizeAttendance?: (eventId: string, eventTitle: string) => void;
  onRateVolunteer?: (eventId: string, volunteerId: string) => void;
}

const EventCard = ({
  event,
  index,
  isOrganizer,
  focused,
  onDelete,
  onEdit,
  onView,
  onApproveRegistration,
  onRejectRegistration,
  onRemoveRegistration,
  onOpenInbox,
  onMessage,
  moderating,
  onCompleteEvent,
  onUpdateAttendance,
  onFinalizeAttendance,
  onRateVolunteer,
}: EventCardProps) => {
    const formatDate = (value?: string) => {
      if (!value) return 'Date TBD';
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return 'Date TBD';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

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

  const approvedCount = event.approvedVolunteers?.length ?? event.volunteers.length;
  const registrationProgress = (approvedCount / event.maxVolunteers) * 100;
  const thumbnail = [event.imageUrl, ...(event.images || [])]
    .map((image) => (typeof image === 'string' ? image.trim() : ''))
    .find((image) => image.length > 0);

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming':
        return 'rounded-full border-blue-500/30 bg-blue-500/10 text-blue-600';
      case 'ongoing':
        return 'rounded-full border-cyan-500/30 bg-cyan-500/10 text-cyan-600';
      case 'completed':
        return 'rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
      case 'cancelled':
        return 'rounded-full border-red-500/30 bg-red-500/10 text-red-600';
      default:
        return 'rounded-full bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Event['status']) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />;
      case 'ongoing':
        return <TrendingUp className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      id={`event-card-${event._id}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-background/80 dark:bg-white/5 backdrop-blur-sm border rounded-2xl overflow-hidden shadow-sm group transition-all duration-300 hover:shadow-lg ${
        focused ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail */}
        <div className="relative w-full md:w-48 h-48 overflow-hidden flex-shrink-0">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Calendar className="h-14 w-14 text-primary/40" />
            </div>
          )}
          <Badge
            className={`absolute top-3 left-3 ${getStatusColor(event.status)}`}
          >
            {getStatusIcon(event.status)}
            <span className="ml-1">{event.status.toUpperCase()}</span>
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 line-clamp-1">{event.title}</h3>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(event.date)}
                </div>
                {timeRange && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {timeRange}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {typeof event.location === 'string' ? event.location : (event.location as any)?.city || 'Location TBD'}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {event.description}
              </p>

              {!isOrganizer && event.myRegistration && (
                <div
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs mb-4 ${
                    event.myRegistration.status === 'approved'
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : event.myRegistration.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : event.myRegistration.status === 'cancelled'
                      ? 'bg-muted text-muted-foreground border-border'
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }`}
                >
                  {event.myRegistration.status === 'approved' && 'Approved'}
                  {event.myRegistration.status === 'pending' && 'Not Approved'}
                  {event.myRegistration.status === 'rejected' && 'Rejected'}
                  {event.myRegistration.status === 'cancelled' && 'Cancelled'}
                </div>
              )}

              {isOrganizer && (event.registrations?.length || 0) > 0 && (
                <div className="mb-4 rounded-lg border border-border p-3 bg-background/70">
                  <p className="font-semibold text-sm mb-2">Volunteer Applications</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(event.registrations || []).map((registration, registrationIndex) => {
                      const volunteerId = getVolunteerId(registration.volunteerId);
                      const volunteerName =
                        typeof registration.volunteerId === 'string'
                          ? registration.name
                          : registration.volunteerId?.name || registration.name;
                      const volunteerEmail =
                        typeof registration.volunteerId === 'string'
                          ? ''
                          : registration.volunteerId?.email || '';

                      const badgeClass =
                        registration.status === 'approved'
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : registration.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : registration.status === 'cancelled'
                          ? 'bg-muted text-muted-foreground border-border'
                          : 'bg-red-500/10 text-red-600 border-red-500/20';

                      return (
                        <div key={`${volunteerId}-${registrationIndex}`} className="border border-border rounded-md p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs text-muted-foreground">
                              <p className="text-sm font-medium text-foreground">{volunteerName}</p>
                              <p>Age {registration.age} • {registration.gender} • {registration.phone}</p>
                              {volunteerEmail ? <p>{volunteerEmail}</p> : null}
                              {registration.createdAt ? (
                                <p>Applied: {new Date(registration.createdAt).toLocaleString()}</p>
                              ) : null}
                            </div>
                            <Badge className={badgeClass}>{registration.status.toUpperCase()}</Badge>
                          </div>

                          {registration.cancellationReason ? (
                            <p className="text-xs italic text-destructive mt-1">
                              Cancellation reason: {registration.cancellationReason}
                            </p>
                          ) : null}

                          {(registration.volunteerRatingForEvent || registration.volunteerFeedback) && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {registration.volunteerRatingForEvent && (
                                <p>
                                  Volunteer rating: {registration.volunteerRatingForEvent}/5
                                </p>
                              )}
                              {registration.volunteerFeedback && (
                                <p className="line-clamp-2">
                                  Feedback: {registration.volunteerFeedback}
                                </p>
                              )}
                            </div>
                          )}

                          {volunteerId && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {registration.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => onApproveRegistration?.(event._id, volunteerId)} disabled={moderating}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => onRejectRegistration?.(event._id, volunteerId)} disabled={moderating}>
                                    Reject
                                  </Button>
                                </>
                              )}

                              {(registration.status === 'cancelled' || registration.status === 'rejected' || registration.status === 'pending') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => onRemoveRegistration?.(event._id, volunteerId)}
                                  disabled={moderating}
                                >
                                  Delete Entry
                                </Button>
                              )}

                              {registration.phone ? (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`tel:${registration.phone}`}><Phone className="h-4 w-4 mr-1" />Call</a>
                                </Button>
                              ) : null}

                              {registration.status === 'approved' && (
                                <>
                                  {event.status === 'completed' && !event.attendanceLocked && (
                                    <div className="flex items-center gap-2 text-xs w-full">
                                      <label className="flex items-center gap-1">
                                        <input
                                          type="checkbox"
                                          className="h-3 w-3"
                                          defaultChecked={registration.present}
                                          onChange={(e) =>
                                            onUpdateAttendance?.(
                                              event._id,
                                              volunteerId,
                                              e.target.checked,
                                              registration.workDuration || '2'
                                            )
                                          }
                                          disabled={moderating}
                                        />
                                        <span>Present</span>
                                      </label>
                                      <div className="flex items-center gap-1 flex-1">
                                        <span>Hours:</span>
                                        <Input
                                          type="text"
                                          defaultValue={registration.workDuration || '2'}
                                          className="h-7 px-2 text-xs max-w-[80px]"
                                          onBlur={(e) =>
                                            onUpdateAttendance?.(
                                              event._id,
                                              volunteerId,
                                              registration.present ?? false,
                                              e.target.value
                                            )
                                          }
                                          disabled={moderating}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {event.attendanceLocked && (
                                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                                      Attendance Finalized
                                    </Badge>
                                  )}
                                </>
                              )}

                              {event.status === 'completed' && registration.present && (
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  {typeof registration.organizerRating === 'number' ? (
                                    <span>
                                      Rated: {registration.organizerRating}/5
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => onRateVolunteer?.(event._id, volunteerId)}
                                      disabled={moderating}
                                    >
                                      <Star className="h-3 w-3 mr-1" />
                                      Rate Volunteer
                                    </Button>
                                  )}
                                </div>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onMessage?.({
                                    eventId: event._id,
                                    eventTitle: event.title,
                                    recipientId: volunteerId,
                                    recipientName: volunteerName,
                                  })
                                }
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Message
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {event.status === 'completed' && !event.attendanceLocked && (
                    <div className="flex justify-end mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onFinalizeAttendance?.(event._id, event.title)}
                        disabled={moderating}
                      >
                        <Award className="h-4 w-4 mr-1" />
                        Finalize Attendance & Certificates
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Bar */}
              {event.status === 'upcoming' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      <Users className="h-3 w-3 inline mr-1" />
                      {approvedCount}/{event.maxVolunteers} volunteers
                    </span>
                    <span className="font-medium">{Math.round(registrationProgress)}%</span>
                  </div>
                  <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      initial={{ width: 0 }}
                      animate={{ width: `${registrationProgress}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              )}

              {/* Countdown for upcoming events - temporarily disabled while testing completion/certificates */}
              {false && event.status === 'upcoming' && event.date && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                  <CountdownTimer targetDate={event.date} compact />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onView} variant="default">
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            {isOrganizer && (
              <>
                {event.status === 'upcoming' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCompleteEvent?.(event)}
                    disabled={moderating}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Completed
                  </Button>
                )}
                <Button size="sm" onClick={onEdit} variant="outline">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={onDelete}
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button size="sm" variant="outline" onClick={() => onOpenInbox?.(event._id, event.title)}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Messages
                </Button>
              </>
            )}
            {!isOrganizer && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onMessage?.({
                    eventId: event._id,
                    eventTitle: event.title,
                    recipientId: event.organizer._id,
                    recipientName: event.organizer.name,
                  })
                }
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Message Organizer
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  loading: boolean;
  currentUserId: string;
  eventTitle: string;
  onOpenThread: (recipientId: string, recipientName: string) => void;
}

const InboxModal = ({ isOpen, onClose, messages, loading, currentUserId, eventTitle, onOpenThread }: InboxModalProps) => {
  if (!isOpen) return null;

  const threads = Object.values(
    (messages || []).reduce((acc, msg) => {
      const other = msg.sender?._id === currentUserId ? msg.recipient : msg.sender;
      if (!other?._id) return acc;
      const existing = acc[other._id];
      if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
        acc[other._id] = { user: other, lastMessage: msg };
      }
      return acc;
    }, {} as Record<string, { user: ChatMessage['sender']; lastMessage: ChatMessage }>)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card/95 dark:bg-zinc-900/90 border border-border/70 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm text-muted-foreground">Messages</p>
            <p className="text-base font-semibold line-clamp-1">{eventTitle}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading messages...</p>
          ) : threads.length === 0 ? (
            <p className="text-muted-foreground text-sm">No messages yet for this event.</p>
          ) : (
            threads.map(({ user, lastMessage }) => (
              <button
                key={user._id}
                className="w-full text-left border border-border rounded-lg p-3 hover:bg-muted/60 transition-all duration-200 hover:scale-[1.01]"
                onClick={() => onOpenThread(user._id, user.name || 'Volunteer')}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{user.name || 'Volunteer'}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{lastMessage.content}</p>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  volunteerId: string;
  volunteerName: string;
}

const CertificateModal = ({ isOpen, onClose, eventId, volunteerId, volunteerName }: CertificateModalProps) => {
  const { toast } = useToast();
  const [hours, setHours] = useState<string>('2');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const parsed = Number(hours);
    if (!parsed || parsed <= 0) {
      toast({
        title: 'Invalid hours',
        description: 'Please enter a positive number of hours.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const resp = await eventService.generateCertificate(eventId, volunteerId, parsed);
      toast({
        title: 'Certificate generated',
        description: 'The certificate has been generated and sent to the volunteer.',
      });
      if (resp.url) {
        window.open(resp.url, '_blank');
      }
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error generating certificate',
        description: error.response?.data?.message || error.message || 'Failed to generate certificate',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card/95 dark:bg-zinc-900/90 border border-border/70 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Generate Certificate
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create a certificate for <span className="font-medium text-foreground">{volunteerName}</span>.
          Enter the total hours of work to show on the certificate.
        </p>
        <div className="space-y-2 mb-4">
          <Label htmlFor="hours" className="text-sm">Hours of Work</Label>
          <Input
            id="hours"
            type="number"
            min={0.5}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={submitting} className="bg-gradient-to-r from-primary to-secondary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            {submitting ? 'Generating...' : 'Generate & Send'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onSubmitted: () => void;
}

const FeedbackModal = ({ isOpen, onClose, eventId, eventTitle, onSubmitted }: FeedbackModalProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast({
        title: 'Invalid rating',
        description: 'Please select a rating between 1 and 5 stars.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      await eventService.submitVolunteerFeedback(eventId, rating, feedback.trim());
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for sharing your experience with the organizer.',
      });
      onSubmitted();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error submitting feedback',
        description: error?.response?.data?.message || 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-card/95 dark:bg-zinc-900/90 border border-border/70 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Rate & Feedback
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Share your experience for <span className="font-medium text-foreground">{eventTitle}</span>. Your
          feedback helps organizers improve future events.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <Label className="text-sm mb-1 block">Rating</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => {
                const value = idx + 1;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.94 }}
                    className="text-yellow-500 transition-all"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        value <= rating ? 'fill-yellow-400' : 'fill-transparent stroke-yellow-500'
                      }`}
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div>
            <Label htmlFor="feedback-text" className="text-sm mb-1 block">Feedback (optional)</Label>
            <textarea
              id="feedback-text"
              className="w-full border border-border rounded-xl bg-background px-3 py-2 text-sm resize-y min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="What went well? What could be improved?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-primary to-secondary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Empty State Component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-12 text-center"
    >
      <div className="inline-block p-4 bg-primary/10 rounded-full text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </motion.div>
  );
};

export default EnhancedDashboard;
