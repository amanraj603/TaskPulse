// mock-server/src/data.ts
// Intentionally messy data to exercise the normalization layer.

export interface RawTask {
  id: string;
  title: string;
  type: string;
  status: string;
  assignee: { id: string; name: string } | null;
  annotationCount: number | string;
  updatedAt: number | string;
  meta: Record<string, unknown>;
}

const BASE_TIME = Date.now();

export const RAW_TASKS: RawTask[] = [
  {
    id: "task-001",
    title: "Annotate street scene dataset batch 1",
    type: "IMAGE",              // uppercase — needs normalization
    status: "in_progress",
    assignee: { id: "u1", name: "Priya Sharma" },
    annotationCount: "42",     // string — needs normalization
    updatedAt: new Date(BASE_TIME - 3_600_000).toISOString(), // ISO string
    meta: { priority: "high", project: "autonomous-driving" },
  },
  {
    id: "task-002",
    title: "Transcribe podcast episode 14",
    type: "audio",
    status: "TODO",
    assignee: null,
    annotationCount: 0,
    updatedAt: BASE_TIME - 7_200_000,
    meta: { duration: "42m", language: "en" },
  },
  {
    id: "task-003",
    title: "Label sentiment in product reviews",
    type: "Text",              // mixed case — needs normalization
    status: "DONE",
    assignee: { id: "u2", name: "Arjun Mehta" },
    annotationCount: 200,
    updatedAt: BASE_TIME - 86_400_000,
    meta: { source: "amazon", category: "electronics" },
  },
  {
    id: "task-004",
    title: "Review QA batch — medical imaging",
    type: "image",
    status: "QA",
    assignee: { id: "u3", name: "Sara Liu" },
    annotationCount: "88",
    updatedAt: BASE_TIME - 1_800_000,
    meta: { organ: "lung", modality: "CT" },
  },
  {
    id: "task-005",
    title: "Classify audio events in factory recordings",
    type: "AUDIO",             // uppercase — needs normalization
    status: "inprogress",      // variant — needs normalization
    assignee: { id: "u1", name: "Priya Sharma" },
    annotationCount: 15,
    updatedAt: BASE_TIME - 900_000,
    meta: { environment: "industrial", snr: "low" },
  },
  {
    id: "task-006",
    title: "NER tagging — legal contracts v2",
    type: "text",
    status: "BLOCKED",
    assignee: null,
    annotationCount: "not-a-number", // invalid — should fall back to 0
    updatedAt: "not-a-date",          // invalid — should fall back to Date.now()
    meta: { blocker: "missing-guidelines" },
  },
  {
    id: "task-007",
    title: "Video frame extraction — traffic cams",
    type: "video",             // unknown type — should be preserved in originalType
    status: "pending",         // unknown status — should be preserved in originalStatus
    assignee: { id: "u4", name: "Tom Nguyen" },
    annotationCount: 5,
    updatedAt: BASE_TIME - 300_000,
    meta: { fps: 30, location: "junction-12" },
  },
  {
    id: "task-008",
    title: "Bounding box review — retail shelf",
    type: "image",
    status: "TODO",
    assignee: null,
    annotationCount: 0,
    updatedAt: BASE_TIME - 10_000,
    meta: { sku_count: 150 },
  },
  {
    id: "task-009",
    title: "Phoneme labeling — children speech corpus",
    type: "audio",
    status: "in_progress",
    assignee: { id: "u2", name: "Arjun Mehta" },
    annotationCount: 34,
    updatedAt: BASE_TIME - 600_000,
    meta: { age_group: "6-10", dialect: "neutral" },
  },
  {
    id: "task-010",
    title: "Document classification — insurance claims",
    type: "text",
    status: "DONE",
    assignee: { id: "u3", name: "Sara Liu" },
    annotationCount: 500,
    updatedAt: BASE_TIME - 172_800_000,
    meta: { insurer: "xyz-corp", year: 2024 },
  },
];

export const TASK_IDS = RAW_TASKS.map((t) => t.id);

// Summaries streamed word-by-word to simulate AI output
export const SUMMARIES: Record<string, string> = {
  "task-001": `## Street Scene Batch 1\n\nThis image annotation task covers **urban driving scenarios** captured across 12 city blocks.\n\n### Key Details\n- **42 annotations** completed so far\n- Focus on pedestrian bounding boxes and traffic sign segmentation\n- Priority: **High** — feeds autonomous driving model v3.2\n\n### Issues Found\n- 3 frames with severe motion blur — marked for re-capture\n- Occlusion guidelines need clarification from project lead\n\n> Estimated completion: 4 hours at current velocity`,

  "task-002": `## Podcast Transcription — Episode 14\n\nAudio transcription task for a **42-minute English podcast** episode.\n\n### Scope\n- Speaker diarization required (2 speakers)\n- Time-coded transcript format\n- No assignee yet — available for pickup\n\n### Notes\n- Background music in first 90 seconds may affect accuracy\n- Recommend using Whisper large-v3 for initial pass`,

  "task-003": `## Sentiment Analysis — Product Reviews\n\n**Completed task** with 200 annotations across electronics product reviews.\n\n### Summary\n- Positive: 124 (62%)\n- Negative: 51 (25.5%)\n- Neutral: 25 (12.5%)\n\n### Quality\nInter-annotator agreement: **0.84 Cohen's Kappa** — excellent consistency`,

  "task-004": `## Medical Imaging QA — Lung CT\n\nCurrently in **QA review** phase for lung CT segmentation.\n\n### Review Checklist\n- [ ] Boundary accuracy for nodules < 6mm\n- [x] Consistent slice-by-slice labeling\n- [x] No label bleed across anatomical structures\n\n> Reviewer: Sara Liu | Modality: CT | Organ: Lung`,

  "task-005": `## Factory Audio Event Classification\n\nClassifying industrial audio events in **low-SNR factory recordings**.\n\n### Event Categories\n1. Machine startup/shutdown\n2. Anomalous vibration\n3. Human speech\n4. Background noise\n\n**15 of ~120 clips** classified so far.`,

  "task-006": `## Legal NER Tagging — Contracts v2\n\n⚠️ **Blocked** — awaiting updated annotation guidelines from legal team.\n\n### Blocked Since\nGuidelines last version: Jan 2024. New entity types (indemnification clauses, governing law) not yet defined.\n\n### Action Required\nProject lead to provide updated schema before work resumes.`,

  "task-007": `## Traffic Camera Frame Extraction\n\nExtracting and labeling frames from **traffic junction cameras** at 30fps.\n\n### Coverage\n- Junction 12, frames 0–1500\n- Vehicle type classification (car, truck, motorbike, bus)\n- 5 annotations completed — early stage\n\n*Note: Task type is 'video' — handled as unknown type in normalization layer.*`,

  "task-008": `## Retail Shelf — Bounding Box Review\n\nBounding box annotation for **150 SKUs** across retail shelf imagery.\n\n### Status\nNot yet started — available for assignment.\n\n### Requirements\n- Tight bounding boxes (no padding > 5px)\n- Label hierarchy: category > brand > product`,

  "task-009": `## Children Speech — Phoneme Labeling\n\nPhoneme-level labeling of a **children's speech corpus** (ages 6–10).\n\n### Progress\n**34 utterances** labeled out of ~200 total.\n\n### Challenges\n- High variability in articulation\n- Neutral dialect baseline — regional variants need separate tags`,

  "task-010": `## Insurance Claims — Document Classification\n\n✅ **Completed** — 500 insurance claim documents classified.\n\n### Category Distribution\n| Category | Count |\n|----------|-------|\n| Liability | 189 |\n| Property | 156 |\n| Health | 105 |\n| Auto | 50 |\n\n**Accuracy estimate**: 96.2% vs. gold standard`,
};
