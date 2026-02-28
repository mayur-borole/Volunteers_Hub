import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onComplete?: () => void;
  className?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const CountdownTimer = ({
  targetDate,
  onComplete,
  className = '',
  compact = false,
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        if (onComplete) onComplete();
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  // If event has passed
  if (timeLeft.total <= 0) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Event has started or ended</span>
      </div>
    );
  }

  // Compact mode for cards
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m
        </span>
      </div>
    );
  }

  // Full countdown display
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Event Starts In</h3>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <TimeUnit value={timeLeft.days} label="Days" />
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <TimeUnit value={timeLeft.minutes} label="Minutes" />
        <TimeUnit value={timeLeft.seconds} label="Seconds" />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary"
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(
                100,
                ((1000 * 60 * 60 * 24 * 7 - timeLeft.total) / (1000 * 60 * 60 * 24 * 7)) * 100
              )}%`,
            }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>
    </div>
  );
};

interface TimeUnitProps {
  value: number;
  label: string;
}

const TimeUnit = ({ value, label }: TimeUnitProps) => {
  return (
    <motion.div
      className="bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm rounded-xl p-4 text-center border border-border/50"
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent"
      >
        {value.toString().padStart(2, '0')}
      </motion.div>
      <div className="text-xs text-muted-foreground font-medium mt-1">{label}</div>
    </motion.div>
  );
};

export default CountdownTimer;
export { CountdownTimer };
