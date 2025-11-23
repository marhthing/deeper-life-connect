
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { LogOut, Users, Calendar, Loader2, ArrowLeft, Download, Video } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface StreamConfig {
  id: string;
  youtube_channel_id: string | null;
  youtube_video_id: string | null;
  is_active: boolean | null;
}

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [channelId, setChannelId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
        fetchStreamConfig();
      } else {
        toast.error("You don't have admin access");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const fetchStreamConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("stream_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setStreamConfig(data);
        setChannelId(data.youtube_channel_id || "");
        setVideoId(data.youtube_video_id || "");
      }
    } catch (error: any) {
      console.error("Error fetching stream config:", error);
    }
  };

  const handleSaveStreamConfig = async () => {
    if (!user) return;

    setSavingConfig(true);
    try {
      if (streamConfig) {
        const { error } = await supabase
          .from("stream_config")
          .update({
            youtube_channel_id: channelId || null,
            youtube_video_id: videoId || null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq("id", streamConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("stream_config")
          .insert({
            youtube_channel_id: channelId || null,
            youtube_video_id: videoId || null,
            is_active: true,
            updated_by: user.id,
          });

        if (error) throw error;
      }

      toast.success("Stream configuration updated successfully");
      fetchStreamConfig();
    } catch (error: any) {
      toast.error("Failed to save stream configuration");
      console.error("Error saving stream config:", error);
    } finally {
      setSavingConfig(false);
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

  const handleDownloadPDF = () => {
    const filteredAttendance = attendance.filter((record) => {
      if (!record.join_time) return false;
      const recordDate = new Date(record.join_time);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return recordDate >= start && recordDate <= end;
      } else if (startDate) {
        const start = new Date(startDate);
        return recordDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return recordDate <= end;
      }
      return true;
    });

    if (filteredAttendance.length === 0) {
      toast.error("No attendance records found for the selected date range");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 22);
    
    doc.setFontSize(11);
    if (startDate && endDate) {
      doc.text(`Period: ${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}`, 14, 30);
    } else if (startDate) {
      doc.text(`From: ${format(new Date(startDate), "MMM dd, yyyy")}`, 14, 30);
    } else if (endDate) {
      doc.text(`Until: ${format(new Date(endDate), "MMM dd, yyyy")}`, 14, 30);
    } else {
      doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy")}`, 14, 30);
    }

    const tableData = filteredAttendance.map((record) => [
      record.profiles?.full_name || "N/A",
      record.profiles?.email || "N/A",
      record.stream_title || "—",
      record.join_time ? format(new Date(record.join_time), "MMM dd, yyyy HH:mm") : "—",
      record.duration_minutes?.toString() || "—",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Name", "Email", "Stream", "Join Time", "Duration (min)"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 0, 0] },
    });

    const filename = startDate && endDate 
      ? `attendance_${startDate}_to_${endDate}.pdf`
      : `attendance_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    
    doc.save(filename);
    toast.success("PDF downloaded successfully");
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

        {/* YouTube Stream Configuration */}
        <Card className="shadow-xl border-2 mb-8">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              YouTube Stream Configuration
            </CardTitle>
            <CardDescription>Configure the YouTube channel or video to display on the dashboard</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channelId">YouTube Channel ID</Label>
                <Input
                  id="channelId"
                  placeholder="UCR4c-NsIGhMqV8W-E-Q5N6A"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use this for live streaming from a channel
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoId">YouTube Video ID (Optional)</Label>
                <Input
                  id="videoId"
                  placeholder="dQw4w9WgXcQ"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use this for a specific video instead of live stream
                </p>
              </div>
            </div>
            <Button
              onClick={handleSaveStreamConfig}
              disabled={savingConfig}
              className="mt-4"
            >
              {savingConfig ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card className="shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Attendance Records
            </CardTitle>
            <CardDescription>Latest 100 check-ins across all services</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Date Filter and Export */}
            <div className="mb-6 flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleDownloadPDF} variant="default">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {(startDate || endDate) && (
                <Button 
                  onClick={() => { setStartDate(""); setEndDate(""); }} 
                  variant="outline"
                >
                  Clear Filters
                </Button>
              )}
            </div>

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
