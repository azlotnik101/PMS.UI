import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuditLogDto } from '../../core/models/pms-api.models';
import { PmsApiService } from '../../core/services/pms-api.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.css'
})
export class AuditLogComponent implements OnInit {
  private readonly api = inject(PmsApiService);

  readonly auditLogs = signal<AuditLogDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs.set(logs.slice().sort((left, right) => right.createdDate.localeCompare(left.createdDate)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load audit logs.');
        this.loading.set(false);
      }
    });
  }
}
