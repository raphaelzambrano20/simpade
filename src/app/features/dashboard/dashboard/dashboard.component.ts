import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { Student } from '../../../core/models/simpade.model';
import { Observable, combineLatest, map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../../core/services/auth.service';

interface RiskSummary {
  alto: number;
  medio: number;
  bajo: number;
}

interface DashboardData {
  rate: number;
  total: number;
  summary: RiskSummary;
  chartPercentages: { alto: number, medio: number, bajo: number };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  dashboardData$: Observable<DashboardData> | undefined;
  userProfile$: Observable<UserProfile | null>;

  constructor(
    private dataService: DataService,
    private authService: AuthService
  ) {
    this.userProfile$ = this.authService.currentUserProfile$;
  }

  ngOnInit(): void {
    const students$ = this.dataService.getStudents();
    const rate$ = this.dataService.getDesertionRate();

    this.dashboardData$ = combineLatest([students$, rate$]).pipe(
      // CORRECCIÓN: Se añaden los tipos explícitos para 'students' y 'rate'
      map(([students, rate]: [Student[], number]) => {
        const summary = this.calculateRiskSummary(students);
        const total = students.length;
        const chartPercentages = this.calculatePercentages(summary, total);
        return { rate, summary, total, chartPercentages };
      })
    );
  }

  private calculateRiskSummary(students: Student[]): RiskSummary {
    const summary: RiskSummary = { alto: 0, medio: 0, bajo: 0 };
    students.forEach(student => {
      switch (student.riskFactor) {
        case 'Alto': summary.alto++; break;
        case 'Medio': summary.medio++; break;
        case 'Bajo': summary.bajo++; break;
      }
    });
    return summary;
  }

  private calculatePercentages(summary: RiskSummary, total: number): { alto: number, medio: number, bajo: number } {
    if (total === 0) {
      return { alto: 0, medio: 0, bajo: 0 };
    }
    const alto = Math.round((summary.alto / total) * 100);
    const medio = Math.round((summary.medio / total) * 100);
    const bajo = 100 - alto - medio;
    return { alto, medio, bajo };
  }

  getPieChartStyles(percentages: { alto: number, medio: number, bajo: number }): string {
    const { alto, medio } = percentages;
    return `conic-gradient(#e74c3c 0% ${alto}%, #f39c12 ${alto}% ${alto + medio}%, #2ecc71 ${alto + medio}% 100%)`;
  }
}

