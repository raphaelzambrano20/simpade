import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeachertoolsComponent } from './teachertools.component';

describe('TeachertoolsComponent', () => {
  let component: TeachertoolsComponent;
  let fixture: ComponentFixture<TeachertoolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeachertoolsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeachertoolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
