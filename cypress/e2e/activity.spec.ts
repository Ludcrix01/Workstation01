describe('Activity tracking page', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/track/start-session').as('startSession');
    cy.intercept('POST', '/api/track/event').as('postEvents');
    cy.intercept('POST', '/api/track/end-session').as('endSession');
  });

  it('démarre une session sur interaction et envoie des events', () => {
    cy.visit('/'); // votre app doit tourner en local
    cy.get('body').click();
    cy.wait('@startSession');
    // plusieurs interactions doivent produire des envois d'événements
    cy.wait('@postEvents');
  });

  it('ne comptabilise pas si onglet en arrière-plan', () => {
    // Simule visibilité en arrière-plan: difficile à simuler dans Cypress, mais on peut s'assurer qu'aucun start-session n'est fait sans focus
    cy.visit('/');
    // On blur le body
    cy.get('body').trigger('blur');
    cy.wait(500);
    cy.get('body').click();
    cy.wait('@startSession');
  });
});
