"use client";

import { PROJECTS } from "@/lib/projects";

export const ProjectInfo = () => {
  const project = PROJECTS[0];

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-base font-medium tracking-tight">{project.title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
      <ul className="list-disc space-y-0.5 pl-4 text-sm leading-relaxed text-muted-foreground">
        {project.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </div>
  );
};
