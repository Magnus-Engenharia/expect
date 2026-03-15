"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/icons/github-icon";
import { PROJECTS } from "@/lib/projects";

export const ActionButtons = () => {
  const project = PROJECTS[0];

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" className="text-foreground" asChild>
        <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
          <GitHubIcon className="size-3.25" />
          Star on GitHub
        </a>
      </Button>
      <Button variant="outline" size="sm" className="text-foreground" asChild>
        <a href={project.docsUrl} target="_blank" rel="noopener noreferrer">
          <BookOpen size={13} />
          Docs
        </a>
      </Button>
    </div>
  );
};
