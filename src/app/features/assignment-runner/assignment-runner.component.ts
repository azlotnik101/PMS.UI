import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AnswerValue,
  ParticipantDto,
  QuestionDto,
  QuestionResponseCreateRequest,
  QuestionType,
  QuestionnaireAssignmentDto,
  QuestionnaireDto
} from '../../core/models/pms-api.models';
import { PmsApiService } from '../../core/services/pms-api.service';

@Component({
  selector: 'app-assignment-runner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assignment-runner.component.html',
  styleUrl: './assignment-runner.component.css'
})
export class AssignmentRunnerComponent implements OnInit {
  private readonly api = inject(PmsApiService);

  readonly participants = signal<ParticipantDto[]>([]);
  readonly questionnaires = signal<QuestionnaireDto[]>([]);
  readonly assignments = signal<QuestionnaireAssignmentDto[]>([]);
  readonly selectedParticipantId = signal<number | null>(null);
  readonly selectedAssignment = signal<QuestionnaireAssignmentDto | null>(null);
  readonly answers = signal<Record<number, AnswerValue>>({});
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly selectedQuestions = computed(() => {
    const questionnaire = this.activeQuestionnaire();
    return (questionnaire?.questions ?? []).slice().sort((left, right) => left.displayOrder - right.displayOrder);
  });
  readonly seededQuestionnaire = computed(() => this.questionnaires()[0] ?? null);
  readonly seededQuestionnaireTitle = computed(() => this.seededQuestionnaire()?.title ?? 'Not seeded');

  ngOnInit(): void {
    this.loadLookups();
  }

  loadLookups(): void {
    this.loading.set(true);
    forkJoin({
      participants: this.api.getParticipants(),
      questionnaires: this.api.getQuestionnaires()
    }).subscribe({
      next: ({ participants, questionnaires }) => {
        this.participants.set(participants);
        this.questionnaires.set(questionnaires);
        if (questionnaires.length === 0) {
          this.error.set('No questionnaire found. Run Scripts/SeedQuestionnairePocData.sql against the PMS database.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load participants or questionnaires.');
        this.loading.set(false);
      }
    });
  }

  participantChanged(participantId: string): void {
    const id = Number(participantId) || null;
    this.selectedParticipantId.set(id);
    this.assignments.set([]);
    this.selectedAssignment.set(null);
    this.answers.set({});

    if (!id) {
      return;
    }

    this.api.getAssignmentsForParticipant(id).subscribe({
      next: (assignments) => this.assignments.set(assignments),
      error: () => this.error.set('Unable to load assignments for the selected participant.')
    });
  }

  assignQuestionnaire(): void {
    const participantId = this.selectedParticipantId();
    const questionnaireId = this.seededQuestionnaire()?.questionnaireId ?? null;
    if (!participantId || !questionnaireId) {
      this.error.set('Select a participant after seeding the questionnaire.');
      return;
    }

    this.api.assignQuestionnaire({
      participantId,
      questionnaireId,
      assignedDate: new Date().toISOString()
    }).subscribe({
      next: (assignment) => {
        this.success.set('Questionnaire assigned.');
        this.assignments.update((items) => [assignment, ...items]);
        this.selectAssignment(assignment);
      },
      error: () => this.error.set('Unable to assign questionnaire.')
    });
  }

  selectAssignment(assignment: QuestionnaireAssignmentDto): void {
    const questionnaire = assignment.questionnaire ?? this.questionnaires().find((item) => item.questionnaireId === assignment.questionnaireId) ?? null;
    this.selectedAssignment.set({
      ...assignment,
      questionnaire
    });
    this.answers.set({});
    this.success.set(null);
    this.error.set(null);

    this.api.getResponsesForAssignment(assignment.questionnaireAssignmentId).subscribe({
      next: (responses) => {
        const answerMap: Record<number, AnswerValue> = {};
        for (const response of responses) {
          if (response.selectedQuestionChoiceIds?.length) {
            answerMap[response.questionId] = response.selectedQuestionChoiceIds;
          } else if (response.numericValue !== null && response.numericValue !== undefined) {
            answerMap[response.questionId] = response.numericValue;
          } else {
            answerMap[response.questionId] = response.textValue ?? '';
          }
        }
        this.answers.set(answerMap);
      },
      error: () => this.error.set('Unable to load existing responses.')
    });
  }

  isVisible(question: QuestionDto): boolean {
    if (!question.parentQuestionId || !question.parentChoiceId) {
      return true;
    }

    const parentAnswer = this.answers()[question.parentQuestionId];
    return Array.isArray(parentAnswer)
      ? parentAnswer.includes(question.parentChoiceId)
      : parentAnswer === question.parentChoiceId;
  }

  setAnswer(questionId: number, value: AnswerValue): void {
    this.answers.update((answers) => ({
      ...answers,
      [questionId]: value
    }));
  }

  toggleMulti(questionId: number, choiceId: number, checked: boolean): void {
    const current = this.answers()[questionId];
    const selected = Array.isArray(current) ? current : [];
    const next = checked ? [...selected, choiceId] : selected.filter((id) => id !== choiceId);
    this.setAnswer(questionId, next);
  }

  isChoiceSelected(questionId: number, choiceId: number): boolean {
    const current = this.answers()[questionId];
    return Array.isArray(current) && current.includes(choiceId);
  }

  submitResponses(): void {
    const assignment = this.selectedAssignment();
    if (!assignment) {
      this.error.set('Select an assignment first.');
      return;
    }

    const requests = this.selectedQuestions()
      .filter((question) => this.isVisible(question))
      .map((question) => this.toResponseRequest(assignment.questionnaireAssignmentId, question));

    if (requests.length === 0) {
      this.error.set('There are no visible questions to submit.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    forkJoin(requests.map((request) => this.api.createQuestionResponse(request))).subscribe({
      next: () => {
        this.api.completeAssignment(assignment.questionnaireAssignmentId).subscribe({
          next: () => {
            this.saving.set(false);
            this.success.set('Responses saved and assignment marked complete.');
            this.participantChanged(String(assignment.participantId));
          },
          error: () => {
            this.saving.set(false);
            this.error.set('Responses were saved, but the assignment could not be marked complete.');
          }
        });
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Unable to save one or more responses.');
      }
    });
  }

  questionTypeLabel(questionType: QuestionType): string {
    switch (questionType) {
      case QuestionType.Numeric:
        return 'Numeric';
      case QuestionType.Text:
        return 'Text';
      case QuestionType.SingleSelect:
        return 'Single select';
      case QuestionType.MultiSelect:
        return 'Multi select';
    }
  }

  private activeQuestionnaire(): QuestionnaireDto | null {
    const assignment = this.selectedAssignment();
    if (!assignment) {
      return null;
    }

    return assignment.questionnaire ?? this.questionnaires().find((questionnaire) => questionnaire.questionnaireId === assignment.questionnaireId) ?? null;
  }

  private toResponseRequest(questionnaireAssignmentId: number, question: QuestionDto): QuestionResponseCreateRequest {
    const value = this.answers()[question.questionId];
    return {
      questionnaireAssignmentId,
      questionId: question.questionId,
      numericValue: question.questionType === QuestionType.Numeric ? Number(value ?? 0) : null,
      textValue: question.questionType === QuestionType.Text ? String(value ?? '') : null,
      selectedQuestionChoiceIds:
        question.questionType === QuestionType.SingleSelect && typeof value === 'number'
          ? [value]
          : question.questionType === QuestionType.MultiSelect && Array.isArray(value)
            ? value
            : []
    };
  }

  protected readonly QuestionType = QuestionType;
}
