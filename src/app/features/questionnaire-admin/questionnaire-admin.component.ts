import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  QuestionDraft,
  QuestionOptionDraft,
  QuestionType,
  QuestionnaireDraft,
  QuestionnaireDto,
  QuestionnaireRequest
} from '../../core/models/pms-api.models';
import { PmsApiService } from '../../core/services/pms-api.service';

@Component({
  selector: 'app-questionnaire-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './questionnaire-admin.component.html',
  styleUrl: './questionnaire-admin.component.css'
})
export class QuestionnaireAdminComponent implements OnInit {
  private readonly api = inject(PmsApiService);

  readonly questionnaires = signal<QuestionnaireDto[]>([]);
  readonly draft = signal<QuestionnaireDraft>(this.emptyDraft());
  readonly selectedId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  private readonly seededOnlineSurvey = signal(false);

  readonly questionTypes = [
    { value: QuestionType.Numeric, label: 'Numeric' },
    { value: QuestionType.Text, label: 'Text' },
    { value: QuestionType.SingleSelect, label: 'Single select' },
    { value: QuestionType.MultiSelect, label: 'Multi select' }
  ];

  readonly isEditing = computed(() => this.selectedId() !== null);

  ngOnInit(): void {
    this.loadQuestionnaires();
  }

  loadQuestionnaires(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getQuestionnaires().subscribe({
      next: (questionnaires) => {
        this.questionnaires.set(questionnaires);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load questionnaires. Confirm the PMS.API project is running on port 5188.');
        this.loading.set(false);
      }
    });
  }

  selectQuestionnaire(questionnaire: QuestionnaireDto): void {
    this.seededOnlineSurvey.set(false);
    this.selectedId.set(questionnaire.questionnaireId);
    this.draft.set({
      questionnaireId: questionnaire.questionnaireId,
      title: questionnaire.title ?? '',
      questions: (questionnaire.questions ?? [])
        .slice()
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((question) => ({
          questionId: question.questionId,
          text: question.text ?? '',
          questionType: question.questionType,
          displayOrder: question.displayOrder,
          parentQuestionId: question.parentQuestionId ?? null,
          parentChoiceId: question.parentChoiceId ?? null,
          choices: (question.choices ?? [])
            .slice()
            .sort((left, right) => left.displayOrder - right.displayOrder)
            .map((choice) => ({
              selectableQuestionChoiceId: choice.selectableQuestionChoiceId,
              choiceText: choice.choiceText ?? '',
              displayOrder: choice.displayOrder
            }))
        }))
    });
    this.success.set(null);
    this.error.set(null);
  }

  newQuestionnaire(): void {
    this.seededOnlineSurvey.set(false);
    this.selectedId.set(null);
    this.draft.set(this.emptyDraft());
    this.success.set(null);
    this.error.set(null);
  }

  addQuestion(): void {
    this.seededOnlineSurvey.set(false);
    const nextOrder = this.draft().questions.length + 1;
    this.draft.update((draft) => ({
      ...draft,
      questions: [
        ...draft.questions,
        {
          text: '',
          questionType: QuestionType.Numeric,
          displayOrder: nextOrder,
          parentQuestionId: null,
          parentChoiceId: null,
          choices: []
        }
      ]
    }));
  }

  removeQuestion(index: number): void {
    this.seededOnlineSurvey.set(false);
    this.draft.update((draft) => ({
      ...draft,
      questions: draft.questions.filter((_, questionIndex) => questionIndex !== index)
    }));
  }

  addChoice(question: QuestionDraft): void {
    this.seededOnlineSurvey.set(false);
    question.choices.push({
      choiceText: '',
      displayOrder: question.choices.length + 1
    });
    this.refreshDraft();
  }

  removeChoice(question: QuestionDraft, index: number): void {
    this.seededOnlineSurvey.set(false);
    question.choices.splice(index, 1);
    question.choices.forEach((choice, choiceIndex) => {
      choice.displayOrder = choiceIndex + 1;
    });
    this.refreshDraft();
  }

  updateQuestionType(question: QuestionDraft, value: string): void {
    this.seededOnlineSurvey.set(false);
    question.questionType = Number(value) as QuestionType;
    if (!this.hasChoices(question)) {
      question.choices = [];
    }
    this.refreshDraft();
  }

  parentChoices(question: QuestionDraft): QuestionOptionDraft[] {
    const parentQuestion = this.draft().questions.find((candidate) => candidate.questionId === question.parentQuestionId);
    return parentQuestion?.choices ?? [];
  }

  hasChoices(question: QuestionDraft): boolean {
    return question.questionType === QuestionType.SingleSelect || question.questionType === QuestionType.MultiSelect;
  }

  saveQuestionnaire(): void {
    const draft = this.draft();
    if (!draft.title.trim() || draft.questions.length === 0) {
      this.error.set('A questionnaire needs a title and at least one question.');
      return;
    }

    const request = this.toRequest(draft);
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const shouldApplySampleDependency = !this.selectedId() && this.seededOnlineSurvey();
    const save$ = this.selectedId()
      ? this.api.updateQuestionnaire(this.selectedId() as number, request)
      : this.api.createQuestionnaire(request);

    save$.subscribe({
      next: (questionnaire) => {
        if (shouldApplySampleDependency) {
          this.applyOnlineSurveyDependency(questionnaire);
          return;
        }

        this.saving.set(false);
        this.success.set(`Saved "${questionnaire.title}".`);
        this.selectQuestionnaire(questionnaire);
        this.loadQuestionnaires();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Unable to save questionnaire. Check required text and option values.');
      }
    });
  }

  deleteSelected(): void {
    const questionnaireId = this.selectedId();
    if (!questionnaireId) {
      return;
    }

    this.api.deleteQuestionnaire(questionnaireId).subscribe({
      next: () => {
        this.success.set('Questionnaire deleted.');
        this.newQuestionnaire();
        this.loadQuestionnaires();
      },
      error: () => this.error.set('Unable to delete questionnaire.')
    });
  }

  seedOnlineSurvey(): void {
    this.seededOnlineSurvey.set(true);
    this.selectedId.set(null);
    this.draft.set({
      title: 'Online Usage Survey',
      questions: [
        {
          text: 'How many hours per day do you spend online?',
          questionType: QuestionType.Numeric,
          displayOrder: 1,
          parentQuestionId: null,
          parentChoiceId: null,
          choices: []
        },
        {
          text: 'Which of the following devices do you use?',
          questionType: QuestionType.MultiSelect,
          displayOrder: 2,
          parentQuestionId: null,
          parentChoiceId: null,
          choices: [
            { choiceText: 'Smartphone', displayOrder: 1 },
            { choiceText: 'Laptop', displayOrder: 2 },
            { choiceText: 'Tablet', displayOrder: 3 }
          ]
        },
        {
          text: 'Which tablet brand do you use?',
          questionType: QuestionType.SingleSelect,
          displayOrder: 3,
          parentQuestionId: null,
          parentChoiceId: null,
          choices: [
            { choiceText: 'Apple', displayOrder: 1 },
            { choiceText: 'Samsung', displayOrder: 2 },
            { choiceText: 'Microsoft Surface', displayOrder: 3 },
            { choiceText: 'Lenovo', displayOrder: 4 },
            { choiceText: 'Huawei', displayOrder: 5 }
          ]
        }
      ]
    });
  }

  private toRequest(draft: QuestionnaireDraft): QuestionnaireRequest {
    return {
      title: draft.title.trim(),
      questions: draft.questions.map((question, index) => ({
        questionId: question.questionId ?? null,
        text: question.text.trim(),
        questionType: question.questionType,
        displayOrder: question.displayOrder || index + 1,
        parentQuestionId: question.parentQuestionId || null,
        parentChoiceId: question.parentChoiceId || null,
        choices: this.hasChoices(question)
          ? question.choices.map((choice, choiceIndex) => ({
              selectableQuestionChoiceId: choice.selectableQuestionChoiceId ?? null,
              choiceText: choice.choiceText.trim(),
              displayOrder: choice.displayOrder || choiceIndex + 1
            }))
          : []
      }))
    };
  }

  private emptyDraft(): QuestionnaireDraft {
    return {
      title: '',
      questions: []
    };
  }

  private refreshDraft(): void {
    this.draft.update((draft) => ({ ...draft, questions: [...draft.questions] }));
  }

  private applyOnlineSurveyDependency(questionnaire: QuestionnaireDto): void {
    const questions = (questionnaire.questions ?? []).slice().sort((left, right) => left.displayOrder - right.displayOrder);
    const devicesQuestion = questions.find((question) => question.text === 'Which of the following devices do you use?');
    const tabletBrandQuestion = questions.find((question) => question.text === 'Which tablet brand do you use?');
    const tabletChoice = devicesQuestion?.choices?.find((choice) => choice.choiceText === 'Tablet');

    if (!devicesQuestion || !tabletBrandQuestion || !tabletChoice) {
      this.saving.set(false);
      this.success.set(`Saved "${questionnaire.title}".`);
      this.error.set('Saved the sample, but the Tablet dependency could not be applied.');
      this.selectQuestionnaire(questionnaire);
      this.loadQuestionnaires();
      return;
    }

    const request: QuestionnaireRequest = {
      title: questionnaire.title ?? '',
      questions: questions.map((question) => ({
        questionId: question.questionId,
        text: question.text ?? '',
        questionType: question.questionType,
        displayOrder: question.displayOrder,
        parentQuestionId:
          question.questionId === tabletBrandQuestion.questionId ? devicesQuestion.questionId : (question.parentQuestionId ?? null),
        parentChoiceId:
          question.questionId === tabletBrandQuestion.questionId ? tabletChoice.selectableQuestionChoiceId : (question.parentChoiceId ?? null),
        choices: (question.choices ?? []).map((choice) => ({
          selectableQuestionChoiceId: choice.selectableQuestionChoiceId,
          choiceText: choice.choiceText ?? '',
          displayOrder: choice.displayOrder
        }))
      }))
    };

    this.api.updateQuestionnaire(questionnaire.questionnaireId, request).subscribe({
      next: (updatedQuestionnaire) => {
        this.seededOnlineSurvey.set(false);
        this.saving.set(false);
        this.success.set(`Saved "${updatedQuestionnaire.title}" with the Tablet dependency.`);
        this.selectQuestionnaire(updatedQuestionnaire);
        this.loadQuestionnaires();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Saved the sample, but the Tablet dependency could not be applied.');
        this.selectQuestionnaire(questionnaire);
        this.loadQuestionnaires();
      }
    });
  }
}
