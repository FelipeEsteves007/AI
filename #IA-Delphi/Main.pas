unit Main;

interface

uses
  Winapi.Windows,
  Winapi.Messages,

  System.SysUtils,
  System.Variants,
  System.Classes,

  Vcl.Graphics,
  Vcl.Controls,
  Vcl.Forms,
  Vcl.Dialogs,
  Vcl.StdCtrls;

type
  TForm3 = class(TForm)
    BtnBoasVindas: TButton;
    procedure BtnBoasVindasClick(Sender: TObject);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

var
  Form3: TForm3;

implementation

{$R *.dfm}

procedure TForm3.BtnBoasVindasClick(Sender: TObject);
begin
  Application.MessageBox('Seja bem-vindo à Imersão IA com Delphi!', 'Boas-vindas',
    MB_OK or MB_ICONINFORMATION);
end;

end.
