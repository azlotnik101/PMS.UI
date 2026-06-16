import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuditLogDto,
  ParticipantDto,
  ParticipantRequest,
  QuestionAnswerDto,
  QuestionResponseCreateRequest,
  QuestionnaireAssignmentCreateRequest,
  QuestionnaireAssignmentDto,
  QuestionnaireDto
} from '../models/pms-api.models';

@Injectable({ providedIn: 'root' })
export class PmsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getQuestionnaires(): Observable<QuestionnaireDto[]> {
    return this.http.get<QuestionnaireDto[]>(`${this.baseUrl}/api/Questionnaires`);
  }

  getQuestionnaire(questionnaireId: number): Observable<QuestionnaireDto> {
    return this.http.get<QuestionnaireDto>(`${this.baseUrl}/api/Questionnaires/${questionnaireId}`);
  }

  getParticipants(): Observable<ParticipantDto[]> {
    return this.http.get<ParticipantDto[]>(`${this.baseUrl}/api/Participants`);
  }

  createParticipant(request: ParticipantRequest): Observable<ParticipantDto> {
    return this.http.post<ParticipantDto>(`${this.baseUrl}/api/Participants`, request);
  }

  updateParticipant(participantId: number, request: ParticipantRequest): Observable<ParticipantDto> {
    return this.http.put<ParticipantDto>(`${this.baseUrl}/api/Participants/${participantId}`, request);
  }

  deleteParticipant(participantId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/Participants/${participantId}`);
  }

  assignQuestionnaire(request: QuestionnaireAssignmentCreateRequest): Observable<QuestionnaireAssignmentDto> {
    return this.http.post<QuestionnaireAssignmentDto>(`${this.baseUrl}/api/questionnaire-assignments`, request);
  }

  getAssignmentsForParticipant(participantId: number): Observable<QuestionnaireAssignmentDto[]> {
    return this.http.get<QuestionnaireAssignmentDto[]>(`${this.baseUrl}/api/questionnaire-assignments/participant/${participantId}`);
  }

  completeAssignment(questionnaireAssignmentId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/questionnaire-assignments/${questionnaireAssignmentId}/complete`, {});
  }

  createQuestionResponse(request: QuestionResponseCreateRequest): Observable<QuestionAnswerDto> {
    return this.http.post<QuestionAnswerDto>(`${this.baseUrl}/api/question-responses`, request);
  }

  getResponsesForAssignment(questionnaireAssignmentId: number): Observable<QuestionAnswerDto[]> {
    return this.http.get<QuestionAnswerDto[]>(`${this.baseUrl}/api/question-responses/assignment/${questionnaireAssignmentId}`);
  }

  getAuditLogs(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(`${this.baseUrl}/api/audit-logs`);
  }
}
