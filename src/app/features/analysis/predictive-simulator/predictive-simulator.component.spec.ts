import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictiveSimulatorComponent } from './predictive-simulator.component';

describe('PredictiveSimulatorComponent', () => {
  let component: PredictiveSimulatorComponent;
  let fixture: ComponentFixture<PredictiveSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictiveSimulatorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PredictiveSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
