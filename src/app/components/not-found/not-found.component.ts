import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // Necesario para el enlace "Volver al Dashboard"

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found-container">
      <h2>❌ Error 404: Página No Encontrada</h2>
      <p>Lo sentimos, la URL que estás buscando no existe dentro de SIMPADE.</p>
      <a routerLink="/dashboard" class="home-link">Volver al Dashboard</a>
    </div>
  `,
  styles: [`
    .not-found-container {
      max-width: 600px;
      margin: 50px auto;
      padding: 40px;
      text-align: center;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .not-found-container h2 {
      color: #dc3545; /* Rojo de error */
      border-bottom: none;
      padding-bottom: 0;
      margin-bottom: 20px;
    }
    .home-link {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      transition: background-color 0.2s;
    }
    .home-link:hover {
      background-color: #0056b3;
    }
  `]
})
export class NotFoundComponent { }
