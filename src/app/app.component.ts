import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { AssignmentRunnerComponent } from './features/assignment-runner/assignment-runner.component';
import { AuditLogComponent } from './features/audit-log/audit-log.component';
import { ParticipantAdminComponent } from './features/participant-admin/participant-admin.component';
import { QuestionnaireAdminComponent } from './features/questionnaire-admin/questionnaire-admin.component';

type AppTab = 'questionnaires' | 'participants' | 'assignments' | 'audit';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    QuestionnaireAdminComponent,
    ParticipantAdminComponent,
    AssignmentRunnerComponent,
    AuditLogComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly activeTab = signal<AppTab>('questionnaires');
  readonly tabs: { id: AppTab; label: string }[] = [
    { id: 'questionnaires', label: 'Questionnaires' },
    { id: 'participants', label: 'Participants' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'audit', label: 'Audit Log' }
  ];

  readonly title = computed(() => this.tabs.find((tab) => tab.id === this.activeTab())?.label ?? 'PMS');

  selectTab(tab: AppTab): void {
    this.activeTab.set(tab);
  }
}
