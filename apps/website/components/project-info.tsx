import { PROJECTS } from "@/lib/projects";

export const ProjectInfo = () => {
  const project = PROJECTS[0];

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-base font-medium tracking-tight">{project.title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
      <div className="flex flex-col gap-0.5 text-sm leading-relaxed text-muted-foreground">
        {project.features.map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>
    </div>
  );
};
