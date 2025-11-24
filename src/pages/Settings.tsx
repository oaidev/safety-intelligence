import { KnowledgeBaseManager } from "@/components/KnowledgeBaseManager";
import SystemPromptsManager from "@/components/SystemPromptsManager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
      <Link to="/">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analyzer
        </Button>
      </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage knowledge bases, AI prompts, and system configuration</p>
          </div>
        </div>

        {/* Tabs for different settings sections */}
        <Tabs defaultValue="knowledge-bases" className="space-y-6">
          <TabsList>
            <TabsTrigger value="knowledge-bases">Knowledge Bases</TabsTrigger>
            <TabsTrigger value="ai-prompts">AI Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge-bases">
            <KnowledgeBaseManager />
          </TabsContent>

          <TabsContent value="ai-prompts">
            <SystemPromptsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;