#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QSystemTrayIcon>
#include <QCloseEvent>
#include <QMenu>
#include <QDir>
#include <QJsonDocument>
#include <QJsonObject>
#include <QDebug>
#include <QUdpSocket>
#include <QClipboard>
#include <QMimeData>

enum CliboardType {
    CB_TEXT = 1,
    CB_HTML,
    CB_IMAGE
};

namespace Ui {
class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

protected:
    QSharedPointer<QSystemTrayIcon> oTrayIcon;
    QSharedPointer<QMenu> oTrayMenu;

    QVector<QByteArray> oCliboardHistoryList;
    QVector<CliboardType> oCliboardHistoryTypeList;

    QString sConfigFilePath;
    QJsonDocument oConfigJsonDocument;
    QJsonObject oConfigJsonObject;

    qint32 iPort;

    QUdpSocket oRecieverUdpSocket;
    QUdpSocket oSenderUdpSocket;
    QClipboard *oClipboard;
    QMimeData oMimeData;

    void fnClipboardChanged(QClipboard::Mode eMode);
    void fnClipboardDataChanged();

    void fnListen();
    void fnReadSignal();

    void fnIconActivated(QSystemTrayIcon::ActivationReason reason);
    void fnCloseEvent(QCloseEvent *event);
    void fnShowHide();
    void fnQuit();
    private slots:
    void on_oSaveButton_clicked();

    private:
    Ui::MainWindow *ui;
};

#endif // MAINWINDOW_H
