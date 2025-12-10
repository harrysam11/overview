import { useState, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  type: 'do' | 'dont';
}

interface ChartData {
  label: string;
  points: number;
  habitPoints: number;
  journalPoints: number;
}

interface AnalyticsChartsProps {
  habits: Habit[];
}

export function AnalyticsCharts({ habits }: AnalyticsChartsProps) {
  const [dailyData, setDailyData] = useState<ChartData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [yearlyData, setYearlyData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [habits]);

  const loadAnalyticsData = async () => {
    if (habits.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Load last 7 days for daily chart
      const today = new Date();
      const sevenDaysAgo = subDays(today, 6);
      const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });

      const { data: dailyRecords } = await supabase
        .from('daily_records')
        .select('*')
        .gte('record_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .lte('record_date', format(today, 'yyyy-MM-dd'));

      const { data: dailyJournals } = await supabase
        .from('journal_entries')
        .select('entry_date')
        .gte('entry_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .lte('entry_date', format(today, 'yyyy-MM-dd'));

      const dailyChartData = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = (dailyRecords || []).filter(r => r.record_date === dateStr);
        const hasJournal = (dailyJournals || []).some(j => j.entry_date === dateStr);

        let habitPoints = 0;
        habits.forEach(habit => {
          const record = dayRecords.find(r => r.habit_id === habit.id);
          if (habit.type === 'do' && record?.completed) habitPoints += 1;
          if (habit.type === 'dont' && record && !record.completed) habitPoints += 1;
        });

        const journalPoints = hasJournal ? 2 : 0;

        return {
          label: format(day, 'EEE'),
          points: habitPoints + journalPoints,
          habitPoints,
          journalPoints,
        };
      });
      setDailyData(dailyChartData);

      // Load last 12 months for monthly chart
      const twelveMonthsAgo = subMonths(today, 11);
      const months = eachMonthOfInterval({ start: twelveMonthsAgo, end: today });

      const { data: monthlyRecords } = await supabase
        .from('daily_records')
        .select('*')
        .gte('record_date', format(startOfMonth(twelveMonthsAgo), 'yyyy-MM-dd'))
        .lte('record_date', format(endOfMonth(today), 'yyyy-MM-dd'));

      const { data: monthlyJournals } = await supabase
        .from('journal_entries')
        .select('entry_date')
        .gte('entry_date', format(startOfMonth(twelveMonthsAgo), 'yyyy-MM-dd'))
        .lte('entry_date', format(endOfMonth(today), 'yyyy-MM-dd'));

      const monthlyChartData = months.map(month => {
        const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
        const monthRecords = (monthlyRecords || []).filter(
          r => r.record_date >= monthStart && r.record_date <= monthEnd
        );
        const monthJournals = (monthlyJournals || []).filter(
          j => j.entry_date >= monthStart && j.entry_date <= monthEnd
        );

        let habitPoints = 0;
        monthRecords.forEach(record => {
          const habit = habits.find(h => h.id === record.habit_id);
          if (habit?.type === 'do' && record.completed) habitPoints += 1;
          if (habit?.type === 'dont' && !record.completed) habitPoints += 1;
        });

        return {
          label: format(month, 'MMM'),
          points: habitPoints + monthJournals.length * 2,
          habitPoints,
          journalPoints: monthJournals.length * 2,
        };
      });
      setMonthlyData(monthlyChartData);

      // Load yearly data (current year)
      const yearStart = startOfYear(today);
      const yearEnd = endOfYear(today);

      const { data: yearRecords } = await supabase
        .from('daily_records')
        .select('*')
        .gte('record_date', format(yearStart, 'yyyy-MM-dd'))
        .lte('record_date', format(yearEnd, 'yyyy-MM-dd'));

      const { data: yearJournals } = await supabase
        .from('journal_entries')
        .select('entry_date')
        .gte('entry_date', format(yearStart, 'yyyy-MM-dd'))
        .lte('entry_date', format(yearEnd, 'yyyy-MM-dd'));

      const yearMonths = eachMonthOfInterval({ start: yearStart, end: today });
      const yearlyChartData = yearMonths.map(month => {
        const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
        const monthRecords = (yearRecords || []).filter(
          r => r.record_date >= monthStart && r.record_date <= monthEnd
        );
        const monthJournals = (yearJournals || []).filter(
          j => j.entry_date >= monthStart && j.entry_date <= monthEnd
        );

        let habitPoints = 0;
        monthRecords.forEach(record => {
          const habit = habits.find(h => h.id === record.habit_id);
          if (habit?.type === 'do' && record.completed) habitPoints += 1;
          if (habit?.type === 'dont' && !record.completed) habitPoints += 1;
        });

        return {
          label: format(month, 'MMM'),
          points: habitPoints + monthJournals.length * 2,
          habitPoints,
          journalPoints: monthJournals.length * 2,
        };
      });
      setYearlyData(yearlyChartData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          Add habits to see analytics
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    habitPoints: { color: 'hsl(var(--primary))' },
    journalPoints: { color: 'hsl(var(--accent))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Last 7 days
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="habitPoints" name="Habits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="journalPoints" name="Journal" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Last 12 months
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="habitPoints"
                    name="Habits"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="journalPoints"
                    name="Journal"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {format(new Date(), 'yyyy')} Overview
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="habitPoints" name="Habits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="journalPoints" name="Journal" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
