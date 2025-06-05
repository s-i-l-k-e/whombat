"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import api from "@/app/api";
import Loading from "@/lib/components/ui/Loading";

export default function SoundEventAnnotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uuid = searchParams.get("uuid");

  useEffect(() => {
    const loadAnnotationTask = async () => {
      try {
        const task = await api.soundEventAnnotations.getAnnotationTask(uuid as string);
        const annotationProjects = await api.annotationProjects.getMany({
          limit: 100, 
        });
        
        for (const project of annotationProjects.items) {
          try {
            const projectTasks = await api.annotationTasks.getMany({
              annotation_project: project,
              limit: 1,
            });
            
            const allProjectTasks = await api.annotationTasks.getMany({
              annotation_project: project,
              limit: 1000, 
            });
            
            const hasTask = allProjectTasks.items.some(t => t.uuid === task.uuid);
            if (hasTask) {
              const url = `/annotation_projects/detail/annotation/?annotation_project_uuid=${project.uuid}&annotation_task_uuid=${task.uuid}&sound_event_annotation_uuid=${uuid}`;
              router.replace(url);
              return;
            }
          } catch (error) {
            continue;
          }
        }
        console.error("Could not find annotation project for sound event annotation");
        router.replace("/exploration/sound_events/scatterplot");
      } catch (error) {
        console.error("Failed to load annotation task for sound event annotation:", error);
        router.replace("/exploration/sound_events/scatterplot");
      }
    };

    if (uuid) {
      loadAnnotationTask();
    }
  }, [uuid, router]);

  return <Loading />;
}