#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QSystemTrayIcon>
#include <QCloseEvent>
#include <QMenu>

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

    void fnIconActivated(QSystemTrayIcon::ActivationReason reason);
    void fnCloseEvent(QCloseEvent *event);
    void fnShowHide();
    void fnQuit();
private:
    Ui::MainWindow *ui;
};

#endif // MAINWINDOW_H
