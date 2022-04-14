// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add(
  'interceptApi',
  ({ namespace } = { namespace: 'default' }) => {
    cy.intercept(Cypress.env('VITE_API_HOST') + '/api/v1/namespaces*', {
      fixture: 'namespaces.json',
    }).as('namespaces-api');

    cy.intercept(
      Cypress.env('VITE_API_HOST') + `/api/v1/namespaces/*/workflows?query=*`,
      { fixture: 'workflows.json' },
    ).as('workflows-api');

    cy.intercept(
      Cypress.env('VITE_API_HOST') +
        `/api/v1/namespaces/*/workflows/archived?query=*`,
      { fixture: 'workflows.json' },
    ).as('workflows-archived-api');

    cy.intercept(Cypress.env('VITE_API_HOST') + '/api/v1/cluster*', {
      fixture: 'cluster.json',
    }).as('cluster-api');

    cy.intercept(Cypress.env('VITE_API_HOST') + '/api/v1/me*', {
      fixture: 'me.json',
    }).as('user-api');

    cy.intercept(Cypress.env('VITE_API_HOST') + '/api/v1/settings*', {
      Auth: { Enabled: false, Options: null },
      DefaultNamespace: namespace,
    }).as('settings-api');
  },
);
