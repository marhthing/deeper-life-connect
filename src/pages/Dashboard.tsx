import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, CheckCircle, Loader2 } from "lucide-react";

const Dashboard = () => {
  const [userData, setUserData] = useState<{ email: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
      setLoading(false);
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  const handleMarkAttendance = () => {
    if (!userData) return;

    setMarkingAttendance(true);
    // Simulate marking attendance
    setTimeout(() => {
      setAttendanceMarked(true);
      toast.success("Attendance marked successfully!");
      setMarkingAttendance(false);
    }, 500);
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Deeper Life Bible Church</h1>
                <p className="text-sm text-primary-foreground/80">Live Stream Service</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Stream */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden shadow-xl border-2">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
                <CardTitle className="text-xl">Live Service</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Join us in worship and fellowship
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted relative">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/live_stream?channel=UCrXZrXlKhSTsJHawPQlMr4A"
                    title="Deeper Life Bible Church Live Stream"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Check-In Panel */}
          <div className="space-y-6">
            <Card className="shadow-xl border-2">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-accent/5">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  Attendance Check-In
                </CardTitle>
                <CardDescription>
                  Record your attendance for today's service
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {attendanceMarked ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-primary">
                        You're Checked In!
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Thank you for joining today's service
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleMarkAttendance(); }} className="space-y-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={markingAttendance}
                    >
                      {markingAttendance ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Check In Now
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Welcome Card */}
            <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-accent/10 border-2">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-primary mb-2">
                  Welcome, <span className="font-semibold">{userData?.fullName || userData?.email}</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  We're blessed to have you join us for worship today. May the Lord's presence be with you throughout this service.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;