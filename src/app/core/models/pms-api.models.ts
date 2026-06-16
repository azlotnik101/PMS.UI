export enum QuestionType {
  Numeric = 1,
  Text = 2,
  SingleSelect = 3,
  MultiSelect = 4
}

export interface SelectableQuestionChoiceDto {
  selectableQuestionChoiceId: number;
  questionId: number;
  choiceText: string | null;
  displayOrder: number;
}

export interface SelectableQuestionChoiceRequest {
  selectableQuestionChoiceId?: number | null;
  choiceText: string;
  displayOrder: number;
}

export interface QuestionDto {
  questionId: number;
  questionnaireId: number;
  text: string | null;
  questionType: QuestionType;
  displayOrder: number;
  parentQuestionId?: number | null;
  parentChoiceId?: number | null;
  choices?: SelectableQuestionChoiceDto[] | null;
}

export interface QuestionRequest {
  questionId?: number | null;
  text: string;
  questionType: QuestionType;
  displayOrder: number;
  parentQuestionId?: number | null;
  parentChoiceId?: number | null;
  choices: SelectableQuestionChoiceRequest[];
}

export interface QuestionnaireDto {
  questionnaireId: number;
  title: string | null;
  questions?: QuestionDto[] | null;
}

export interface QuestionnaireRequest {
  title: string;
  questions: QuestionRequest[];
}

export interface ParticipantDto {
  participantId: number;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  dateOfBirth: string;
  participantCode: string | null;
  startDate: string;
}

export interface ParticipantRequest {
  firstName: string;
  lastName: string;
  emailAddress: string;
  dateOfBirth: string;
  participantCode: string;
  startDate: string;
}

export interface QuestionnaireAssignmentCreateRequest {
  participantId: number;
  questionnaireId: number;
  assignedDate?: string | null;
}

export interface QuestionnaireAssignmentDto {
  questionnaireAssignmentId: number;
  participantId: number;
  questionnaireId: number;
  assignedDate: string;
  completed: boolean;
  participant?: ParticipantDto | null;
  questionnaire?: QuestionnaireDto | null;
}

export interface QuestionResponseCreateRequest {
  questionnaireAssignmentId: number;
  questionId: number;
  textValue?: string | null;
  numericValue?: number | null;
  selectedQuestionChoiceIds?: number[] | null;
}

export interface QuestionAnswerDto {
  questionResponseId: number;
  questionnaireAssignmentId: number;
  questionId: number;
  textValue?: string | null;
  numericValue?: number | null;
  answeredDate: string;
  selectedQuestionChoiceIds?: number[] | null;
}

export interface AuditLogDto {
  auditLogId: number;
  entityName: string | null;
  entityId: number;
  action: string | null;
  details: string | null;
  createdDate: string;
}

export interface QuestionOptionDraft {
  selectableQuestionChoiceId?: number | null;
  choiceText: string;
  displayOrder: number;
}

export interface QuestionDraft {
  questionId?: number | null;
  text: string;
  questionType: QuestionType;
  displayOrder: number;
  parentQuestionId?: number | null;
  parentChoiceId?: number | null;
  choices: QuestionOptionDraft[];
}

export interface QuestionnaireDraft {
  questionnaireId?: number | null;
  title: string;
  questions: QuestionDraft[];
}

export interface ParticipantDraft {
  participantId?: number | null;
  firstName: string;
  lastName: string;
  emailAddress: string;
  dateOfBirth: string;
  participantCode: string;
  startDate: string;
}

export type AnswerValue = string | number | number[] | null;
