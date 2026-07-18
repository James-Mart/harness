import type { WiringAdvisoryCue } from "@/model/validationCues";
import type { WorkPoolAdvisoryCue } from "@/model/workpoolGraph";

/** All advisory cue kinds shown on the canvas (wiring ∪ work-pool). */
export type AdvisoryCue = WorkPoolAdvisoryCue | WiringAdvisoryCue;

export type { WiringAdvisoryCue, WorkPoolAdvisoryCue };
