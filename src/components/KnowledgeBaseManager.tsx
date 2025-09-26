import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Upload, FileText, Settings } from 'lucide-react';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { BulkUploadForm } from './BulkUploadForm';
import { PromptTemplateEditor } from './PromptTemplateEditor';

export function KnowledgeBaseManager() {
  return (
    <div className="w-full">
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Manage Knowledge Bases
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Edit Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Knowledge Base Management
              </CardTitle>
              <CardDescription>
                Create, edit, and manage your knowledge bases. Add new knowledge bases manually or view existing ones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeBaseList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-accent" />
                Bulk Upload Data
              </CardTitle>
              <CardDescription>
                Upload large datasets via Excel (.xlsx) or CSV files. Supports up to 50,000 rows with progress tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUploadForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-info" />
                Prompt Template Editor
              </CardTitle>
              <CardDescription>
                Customize the AI analysis prompts for each knowledge base. Use placeholders for dynamic content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptTemplateEditor />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}