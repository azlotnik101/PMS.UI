import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParticipantDraft, ParticipantDto, ParticipantRequest } from '../../core/models/pms-api.models';
import { PmsApiService } from '../../core/services/pms-api.service';

@Component({
  selector: 'app-participant-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './participant-admin.component.html',
  styleUrl: './participant-admin.component.css'
})
export class ParticipantAdminComponent implements OnInit {
  private readonly api = inject(PmsApiService);

  readonly participants = signal<ParticipantDto[]>([]);
  readonly draft = signal<ParticipantDraft>(this.emptyDraft());
  readonly selectedId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly isEditing = computed(() => this.selectedId() !== null);

  ngOnInit(): void {
    this.loadParticipants();
  }

  loadParticipants(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getParticipants().subscribe({
      next: (participants) => {
        this.participants.set(participants);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load participants.');
        this.loading.set(false);
      }
    });
  }

  selectParticipant(participant: ParticipantDto): void {
    this.selectedId.set(participant.participantId);
    this.draft.set({
      participantId: participant.participantId,
      firstName: participant.firstName ?? '',
      lastName: participant.lastName ?? '',
      emailAddress: participant.emailAddress ?? '',
      dateOfBirth: this.toDateInput(participant.dateOfBirth),
      participantCode: participant.participantCode ?? '',
      startDate: this.toDateInput(participant.startDate)
    });
    this.success.set(null);
  }

  newParticipant(): void {
    this.selectedId.set(null);
    this.draft.set(this.emptyDraft());
    this.success.set(null);
    this.error.set(null);
  }

  saveParticipant(): void {
    const draft = this.draft();
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.emailAddress.trim() || !draft.participantCode.trim()) {
      this.error.set('First name, last name, email address, and participant code are required.');
      return;
    }

    const request: ParticipantRequest = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      emailAddress: draft.emailAddress.trim(),
      dateOfBirth: this.toIso(draft.dateOfBirth),
      participantCode: draft.participantCode.trim(),
      startDate: this.toIso(draft.startDate)
    };

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const save$ = this.selectedId()
      ? this.api.updateParticipant(this.selectedId() as number, request)
      : this.api.createParticipant(request);

    save$.subscribe({
      next: (participant) => {
        this.saving.set(false);
        this.success.set(`Saved ${participant.firstName} ${participant.lastName}.`);
        this.selectParticipant(participant);
        this.loadParticipants();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(this.toErrorMessage(error, 'Unable to save participant.'));
      }
    });
  }

  deleteSelected(): void {
    const participantId = this.selectedId();
    if (!participantId) {
      return;
    }

    this.api.deleteParticipant(participantId).subscribe({
      next: () => {
        this.success.set('Participant deleted.');
        this.newParticipant();
        this.loadParticipants();
      },
      error: () => this.error.set('Unable to delete participant.')
    });
  }

  private emptyDraft(): ParticipantDraft {
    const today = new Date().toISOString().slice(0, 10);
    return {
      firstName: '',
      lastName: '',
      emailAddress: '',
      dateOfBirth: today,
      participantCode: '',
      startDate: today
    };
  }

  private toIso(value: string): string {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  private toDateInput(value: string): string {
    return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (error.status === 0) {
      return `${fallback} The API did not allow the browser request. Confirm PMS.API is running and CORS is enabled.`;
    }

    const problemDetails = typeof error.error === 'object' && error.error !== null ? error.error as { title?: string; detail?: string } : null;
    const detail = problemDetails?.detail ?? problemDetails?.title ?? (typeof error.error === 'string' ? error.error : '');

    return detail ? `${fallback} ${error.status}: ${detail}` : `${fallback} HTTP ${error.status}.`;
  }
}
