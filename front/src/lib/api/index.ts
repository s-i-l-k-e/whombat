/**
 * Whombat Javascript API
 *
 * This file is the entry point for the Whombat Javascript API.
 * Use the API to interact with the Whombat backend.
 */
import axios from "axios";

import { registerAnnotationProjectAPI } from "./annotation_projects";
import { registerAnnotationTasksAPI } from "./annotation_tasks";
import { registerAudioAPI } from "./audio";
import { registerClipAnnotationsAPI } from "./clip_annotations";
import { registerClipEvaluationAPI } from "./clip_evaluations";
import { registerClipPredictionsAPI } from "./clip_predictions";
import { registerClipAPI } from "./clips";
import { registerDatasetAPI } from "./datasets";
import { registerEvaluationSetAPI } from "./evaluation_sets";
import { registerEvaluationAPI } from "./evaluations";
import { registerModelRunAPI } from "./model_runs";
import { registerNotesAPI } from "./notes";
import { registerPluginsAPI } from "./plugins";
import { registerRecordingAPI } from "./recordings";
import { registerSoundEventAnnotationsAPI } from "./sound_event_annotations";
import { registerSoundEventEvaluationAPI } from "./sound_event_evaluations";
import { registerSoundEventPredictionsAPI } from "./sound_event_predictions";
import { registerSoundEventAPI } from "./sound_events";
import { registerSpectrogramAPI } from "./spectrograms";
import { registerTagAPI } from "./tags";
import { registerUserAPI } from "./user";
import { registerUserRunAPI } from "./user_runs";
import { getSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type APIConfig = {
  baseURL: string;
};

const DEFAULT_CONFIG: APIConfig = {
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_HOST}`
};

/**
 * Create an instance of the Whombat API.
 */
export default function createAPI(config: APIConfig = DEFAULT_CONFIG) {
  let instance = axios.create(config);
  instance.interceptors.request.use(async (config) => {
    const session = await getSession();
    if ((session as any).accessToken) {
      config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
    }
    return config;
  }, (error) => {
    return Promise.reject(error);
  });

  instance.interceptors.response.use(
    response => response,
    error => {
      const router = useRouter();
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
        router.push("/login");
      }
      return Promise.reject(error);
    }
  );

  return {
    annotationProjects: registerAnnotationProjectAPI(instance, {
      baseUrl: config.baseURL,
    }),
    soundEventAnnotations: registerSoundEventAnnotationsAPI(instance),
    clipAnnotations: registerClipAnnotationsAPI(instance),
    audio: registerAudioAPI({ baseUrl: config.baseURL }),
    clips: registerClipAPI(instance),
    datasets: registerDatasetAPI({ instance }),
    evaluationSets: registerEvaluationSetAPI(instance, {
      baseUrl: config.baseURL,
    }),
    notes: registerNotesAPI(instance),
    recordings: registerRecordingAPI(instance),
    soundEvents: registerSoundEventAPI(instance),
    spectrograms: registerSpectrogramAPI({ baseUrl: config.baseURL }),
    tags: registerTagAPI(instance),
    annotationTasks: registerAnnotationTasksAPI(instance),
    user: registerUserAPI(instance),
    plugins: registerPluginsAPI(instance),
    soundEventPredictions: registerSoundEventPredictionsAPI(instance),
    clipPredictions: registerClipPredictionsAPI(instance),
    modelRuns: registerModelRunAPI(instance),
    userRuns: registerUserRunAPI(instance),
    clipEvaluations: registerClipEvaluationAPI(instance),
    soundEventEvaluations: registerSoundEventEvaluationAPI(instance),
    evaluations: registerEvaluationAPI(instance),
  } as const;
}
