"use client";

import React from "react"

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload,
  FileCode,
  HelpCircle,
  Play,
  Check,
  ArrowRight,
  X,
  Loader2,
  Code2,
} from "lucide-react";
import { toast } from "sonner";

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
];

const sampleCode = `function calculateDiscount(price, discountPercent) {
  // Calculate the discounted price
  let discount = price * discountPercent / 100;
  let finalPrice = price - discount;
  
  // BUG: Missing validation for negative values
  // BUG: No type checking for inputs
  
  if (finalPrice < 0) {
    return 0;
  }
  
  return finalPrice;
}

// Example usage
const price = "100"; // Should be a number
const discount = calculateDiscount(price, 20);
console.log("Final price:", discount);

// Security: Exposing sensitive data
const apiKey = "sk_live_12345678901234567890";
fetch('/api/payment', {
  headers: {
    'Authorization': apiKey
  }
});`;

const steps = [
  { number: 1, title: "Upload Code", description: "Upload your code file or paste code" },
  { number: 2, title: "Select Language", description: "Choose the programming language" },
  { number: 3, title: "Analyze", description: "Run AI-powered code analysis" },
];

function CodeReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const useSample = searchParams.get("sample") === "true";

  const [currentStep, setCurrentStep] = useState(1);
  const [code, setCode] = useState(useSample ? sampleCode : "");
  const [fileName, setFileName] = useState(useSample ? "sample.js" : "");
  const [language, setLanguage] = useState(useSample ? "javascript" : "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content);
      setFileName(file.name);

      // Auto-detect language from file extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        js: "javascript",
        ts: "typescript",
        py: "python",
        java: "java",
        go: "go",
        rs: "rust",
        cpp: "cpp",
        cs: "csharp",
        php: "php",
        rb: "ruby",
      };
      if (ext && langMap[ext]) {
        setLanguage(langMap[ext]);
      }

      toast.success(`File "${file.name}" uploaded successfully!`);
      if (currentStep === 1) setCurrentStep(2);
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAnalyze = async () => {
    if (!code) {
      toast.error("Please upload or paste code first");
      return;
    }
    if (!language) {
      toast.error("Please select a programming language");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    // Simulate progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          return 90; // Stop at 90% until API responds
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      // Call backend API (authenticated endpoint that saves to MongoDB)
      const api = (await import('@/lib/api')).default;
      const result = await api.analyzeCodeAuth(code, language, fileName);

      clearInterval(interval);
      setProgress(100);

      if (result.success && result.data) {
        // Extract review ID from metadata or direct property
        const reviewId = result.data.metadata?.id || result.data._id || result.data.id;

        if (!reviewId) {
          toast.error("Review completed but ID not found");
          setIsAnalyzing(false);
          setProgress(0);
          return;
        }

        // Store review data in sessionStorage for immediate access
        sessionStorage.setItem('latestReview', JSON.stringify(result.data));

        toast.success("Analysis complete! Opening in editor…");

        // Collect issues — data is nested under reviewData.issues.*
        const reviewData = result.data;
        const issueBugs = reviewData.issues?.bugs || reviewData.bugs || [];
        const issueSecurity = reviewData.issues?.security || reviewData.security || [];
        const issuePerf = reviewData.issues?.performance || reviewData.performance || [];
        const allIssues = [...issueBugs, ...issueSecurity, ...issuePerf];

        try {
          const editorRes = await api.createEditorFileFromScan(
            reviewId,
            reviewData.summary?.fileName || reviewData.fileName || fileName || 'untitled',
            reviewData.code || code,
            reviewData.summary?.language || reviewData.language || language || 'text',
            allIssues,
          );
          if (editorRes?.success && editorRes?.data?.fileId) {
            setTimeout(() => {
              router.push(`/dashboard/editor/${editorRes.data.fileId}`);
            }, 800);
            return;
          }
        } catch (_) { /* fall through to results page */ }

        // Fallback: redirect to results page with the review ID
        setTimeout(() => {
          router.push(`/dashboard/results/${reviewId}`);
        }, 1000);
      } else {
        toast.error(result.error || "Analysis failed. Please try again.");
        setIsAnalyzing(false);
        setProgress(0);
      }
    } catch (error: any) {
      clearInterval(interval);
      setIsAnalyzing(false);
      setProgress(0);
      toast.error(error.message || "Analysis failed. Please try again.");
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return code.length > 0;
    if (currentStep === 2) return language.length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < 3 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">New Code Review</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your code and let AI analyze it for bugs, security issues, and performance improvements.
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${currentStep > step.number
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.number
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-muted text-muted-foreground"
                      }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{step.number}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${currentStep >= step.number ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-4 h-0.5 flex-1 transition-colors ${currentStep > step.number ? "bg-primary" : "bg-muted"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
            {currentStep === 1 && (
              <>
                <Upload className="h-5 w-5 text-primary" />
                Upload Your Code
              </>
            )}
            {currentStep === 2 && (
              <>
                <Code2 className="h-5 w-5 text-primary" />
                Select Programming Language
              </>
            )}
            {currentStep === 3 && (
              <>
                <Play className="h-5 w-5 text-primary" />
                Run Analysis
              </>
            )}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Drag and drop a file, or paste your code below"}
            {currentStep === 2 && "Choose the language for accurate analysis"}
            {currentStep === 3 && "Review your submission and start the AI analysis"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Upload Code */}
          {currentStep === 1 && (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
              >
                <input
                  type="file"
                  accept=".js,.ts,.py,.java,.go,.rs,.cpp,.cs,.php,.rb,.jsx,.tsx"
                  onChange={handleFileInput}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      Drag and drop your code file here
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      or click to browse. Supports .js, .ts, .py, .java, .go, and more
                    </p>
                  </div>
                  <Button variant="outline" type="button">
                    <FileCode className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>
              </div>

              {/* File Info */}
              {fileName && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <FileCode className="h-5 w-5 text-primary" />
                  <span className="flex-1 font-medium text-foreground">{fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCode("");
                      setFileName("");
                      setLanguage("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Code Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="code" className="text-sm font-medium text-foreground">
                    Or paste your code here
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Paste any code snippet you want to analyze</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="code"
                  placeholder={`// Paste your code here...\nfunction example() {\n  // Your code\n}`}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (!fileName) setFileName("untitled.txt");
                  }}
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {code.length} characters • {code.split("\n").length} lines
                </p>
              </div>
            </>
          )}

          {/* Step 2: Select Language */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="language" className="text-sm font-medium text-foreground">
                    Programming Language
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select the language for more accurate analysis</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select a language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll use language-specific rules and best practices for analysis.
                </p>
              </div>

              {/* Code Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Code Preview</Label>
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{fileName}</span>
                    {language && (
                      <Badge variant="secondary" className="ml-auto">
                        {languages.find((l) => l.value === language)?.label}
                      </Badge>
                    )}
                  </div>
                  <pre className="overflow-x-auto font-mono text-sm text-muted-foreground max-h-[200px]">
                    {code.slice(0, 500)}
                    {code.length > 500 && "..."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Analyze */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="rounded-lg border border-border bg-muted/50 p-6 space-y-4">
                <h3 className="font-semibold text-foreground">Review Summary</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">File</p>
                      <p className="font-medium text-foreground">{fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Code2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Language</p>
                      <p className="font-medium text-foreground">
                        {languages.find((l) => l.value === language)?.label}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {code.split("\n").length} lines \u2022 {code.length} characters
                  </p>
                </div>
              </div>

              {/* Analysis Progress */}
              {isAnalyzing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Analyzing code...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {progress < 30 && "Parsing code structure..."}
                    {progress >= 30 && progress < 60 && "Detecting potential bugs..."}
                    {progress >= 60 && progress < 90 && "Scanning for security issues..."}
                    {progress >= 90 && "Generating recommendations..."}
                  </div>
                </div>
              )}

              {/* Analysis Info */}
              {!isAnalyzing && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="font-medium text-foreground mb-2">What we&apos;ll analyze:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Bug detection and potential runtime errors
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Security vulnerabilities and best practices
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Performance optimization suggestions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Code quality and maintainability improvements
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isAnalyzing}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleAnalyze} disabled={isAnalyzing} size="lg">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Run Analysis
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CodeReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CodeReviewPageContent />
    </Suspense>
  );
}
