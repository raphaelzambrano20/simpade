import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DataService } from '../../../core/services/data.service';
import { SimulationResult } from '../../../core/models/simpade.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-predictive-simulator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe],
  templateUrl: './predictive-simulator.component.html',
  styleUrls: ['./predictive-simulator.component.css']
})
export class PredictiveSimulatorComponent implements OnInit {
  simulatorForm!: FormGroup;
  simulationResult: SimulationResult | null = null;
  loading = false;

  // Observable para mostrar la tasa de deserción actual como referencia
  currentDesertionRate$: Observable<number>;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService
  ) {
    // Obtenemos la tasa de deserción actual del sistema
    this.currentDesertionRate$ = this.dataService.getDesertionRate();
  }

  ngOnInit(): void {
    // Inicializamos el formulario con las nuevas intervenciones
    this.simulatorForm = this.fb.group({
      studentsForTutoring: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      parentWorkshops: [5, [Validators.required, Validators.min(0), Validators.max(50)]],
      psychologyHours: [20, [Validators.required, Validators.min(0), Validators.max(200)]],
    });
  }

  runSimulation(): void {
    if (this.simulatorForm.invalid) {
      this.simulatorForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.simulationResult = null;
    const { studentsForTutoring, parentWorkshops, psychologyHours } = this.simulatorForm.value;

    // Llamamos al método de simulación actualizado en el DataService
    this.dataService.runSimulation(studentsForTutoring, parentWorkshops, psychologyHours)
      .subscribe({
        next: (result) => {
          this.simulationResult = result;
          this.loading = false;
        },
        error: (err) => {
          console.error("Error en la simulación:", err);
          this.simulationResult = null;
          this.loading = false;
          // Aquí se podría mostrar un mensaje de error en la UI
        }
      });
  }
}

