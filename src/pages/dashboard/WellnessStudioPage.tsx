import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function WellnessStudioPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 pt-24">
      <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wellness Studio</h1>
          <p className="text-muted-foreground">Mindful money, stress reduction, and healthy habits.</p>
        </div>
        <Badge variant="secondary">AI Team Active</Badge>
      </div>

      <Tabs defaultValue="stories" className="w-full">
        <TabsList>
          <TabsTrigger value="stories">Stories</TabsTrigger>
          <TabsTrigger value="habits">Habits</TabsTrigger>
          <TabsTrigger value="breath">Breathing</TabsTrigger>
        </TabsList>
        <TabsContent value="stories">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Financial Stories</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your personalized stories and reflections will appear here.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="habits">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Habits & Routines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Track and improve routines that impact your spending and stress.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="breath">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Breathing Exercises</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Quick breathing guides to reset before financial decisions.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

