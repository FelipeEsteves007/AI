import { createMailerFromEnv, renderTemplate, textToHtml } from '@server/utils/mailer';

describe('mailer', () => {
  it('renderTemplate troca name e course, com ou sem espaços', () => {
    expect(renderTemplate('{{name}} / {{ course }} / {{outro}}', { name: 'Ana', course: 'Delphi' })).toBe(
      'Ana / Delphi / {{outro}}',
    );
  });

  it('textToHtml escapa HTML e quebra linhas', () => {
    expect(textToHtml('a < b\n"c" & d')).toContain('a &lt; b<br>&quot;c&quot; &amp; d');
  });

  it('sem SMTP_HOST, simula o envio e devolve um messageId', async () => {
    const mailer = createMailerFromEnv({ NODE_ENV: 'test' });

    const result = await mailer.send({ to: 'a@b.com', subject: 'S', text: 'T', html: '<p>T</p>' });

    expect(result.messageId).toBeTruthy();
  });
});
