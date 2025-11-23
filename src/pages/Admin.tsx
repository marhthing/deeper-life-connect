import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Users, Calendar, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  join_time: string | null;
  leave_time: string | null;
  duration_minutes: number | null;
  stream_title: string | null;
  verification_code: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsAdmin(true);
        fetchAttendance();
      } else {
        toast.error("You don't have admin access");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          join_time,
          leave_time,
          duration_minutes,
          stream_title,
          verification_code,
          profiles (
            full_name,
            email
          )
        `)
        .order("join_time", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAttendance(data || []);
    } catch (error: any) {
      toast.error("Failed to load attendance records");
      console.error("Error fetching attendance:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayCount = attendance.filter((record) => {
    if (!record.join_time) return false;
    const recordDate = new Date(record.join_time);
    const today = new Date();
    return recordDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-primary-foreground/80">
                  Attendance Management
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-3">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-3xl text-primary">
                {attendance.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-lg border-2 bg-gradient-to-br from-accent/10 to-accent/5">
            <CardHeader className="pb-3">
              <CardDescription>Today's Attendance</CardDescription>
              <CardTitle className="text-3xl text-primary">
                {todayCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-3">
              <CardDescription>Current Date</CardDescription>
              <CardTitle className="text-2xl text-primary">
                {format(new Date(), "MMM dd, yyyy")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Attendance Records
            </CardTitle>
            <CardDescription>Latest 100 check-ins across all services</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAttendance ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No attendance records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Stream Title</TableHead>
                      <TableHead>Join Time</TableHead>
                      <TableHead>Duration (min)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.profiles?.full_name || "N/A"}
                        </TableCell>
                        <TableCell>{record.profiles?.email || "N/A"}</TableCell>
                        <TableCell>
                          {record.stream_title || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.join_time 
                            ? format(new Date(record.join_time), "PPp")
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {record.duration_minutes || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
