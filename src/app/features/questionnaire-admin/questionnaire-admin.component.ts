import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { QuestionDto, QuestionType, QuestionnaireDto } from '../../core/models/pms-api.models';
import { PmsApiService } from '../../core/services/pms-api.service';

@Component({
  selector: 'app-questionnaire-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './questionnaire-admin.component.html',
  styleUrl: './questionnaire-admin.component.css'
})
export class QuestionnaireAdminComponent implements OnInit {
  private readonly api = inject(PmsApiService);

  readonly questionnaire = signal<QuestionnaireDto | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly questions = computed(() =>
    (this.questionnaire()?.questions ?? []).slice().sort((left, right) => left.displayOrder - right.displayOrder)
  );

  ngOnInit(): void {
    this.loadQuestionnaire();
  }

  loadQuestionnaire(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getQuestionnaires().subscribe({
      next: (questionnaires) => {
        this.questionnaire.set(questionnaires[0] ?? null);
        this.loading.set(false);

        if (questionnaires.length === 0) {
          this.error.set('No questionnaire found. Run Scripts/SeedQuestionnairePocData.sql against the PMS database.');
        }
      },
      error: () => {
        this.error.set('Unable to load the seeded questionnaire. Confirm the PMS.API project is running on port 5188.');
        this.loading.set(false);
      }
    });
  }

  dependencyText(question: QuestionDto): string {
    if (!question.parentQuestionId || !question.parentChoiceId) {
      return 'Always shown';
    }

    const parentQuestion = this.questions().find((candidate) => candidate.questionId === question.parentQuestionId);
    const parentChoice = parentQuestion?.choices?.find((choice) => choice.selectableQuestionChoiceId === question.parentChoiceId);

    return parentQuestion && parentChoice
      ? `Shown when "${parentChoice.choiceText}" is selected for "${parentQuestion.text}"`
      : 'Conditional display rule';
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
}
